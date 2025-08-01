;; Mythrelia Player Profile Contract
;; Manages player identity, guilds, impact scores, and linked NFT assets.

(define-data-var admin principal tx-sender)
(define-data-var paused bool false)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-ALREADY-REGISTERED u101)
(define-constant ERR-NOT-REGISTERED u102)
(define-constant ERR-ALREADY-IN-GUILD u103)
(define-constant ERR-NOT-IN-GUILD u104)
(define-constant ERR-PAUSED u105)
(define-constant ERR-NFT-ALREADY-LINKED u107)
(define-constant ERR-NFT-NOT-LINKED u108)
(define-constant ERR-NFT-LIMIT u109)

;; Constants
(define-constant MAX-NFTS u10)
(define-constant ZERO u0)
(define-constant ONE u1)

;; Storage maps
(define-map impact-scores principal uint)
(define-map metadata-uri principal (optional (buff 256)))
(define-map guild-membership principal (optional principal))
(define-map guild-membership-inverse { guild: principal, player: principal } bool)
(define-map linked-nft { player: principal, idx: uint } (tuple (asset-contract principal) (token-id uint)))
(define-map nft-counts principal uint)

;; Private helpers

(define-private (is-admin)
  (is-eq tx-sender (var-get admin)))

(define-private (assert-not-paused)
  (asserts! (is-eq false (var-get paused)) (err ERR-PAUSED)))

;; Admin controls

(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set admin new-admin)
    (ok true)))

(define-public (set-pause (should-pause bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set paused should-pause)
    (ok should-pause)))

;; Player registration

(define-public (register-player)
  (begin
    (assert-not-paused)
    (let ((existing (map-get? impact-scores tx-sender)))
      (asserts! (is-none existing) (err ERR-ALREADY-REGISTERED))
      (map-set impact-scores tx-sender u0)
      (map-set metadata-uri tx-sender (some (utf8 "default")))
      (map-set guild-membership tx-sender none)
      (map-set nft-counts tx-sender u0)
      (ok true))))

;; Impact score modification

(define-public (add-impact (delta uint))
  (begin
    (assert-not-paused)
    (let ((current (map-get? impact-scores tx-sender)))
      (match current
        some (let ((new-score (uadd (unwrap current u0) delta)))
               (map-set impact-scores tx-sender new-score)
               (ok new-score))
        none (err ERR-NOT-REGISTERED)))))

;; Metadata updating

(define-public (set-metadata (uri (buff 256)))
  (begin
    (assert-not-paused)
    (let ((registered (map-get? impact-scores tx-sender)))
      (asserts! (is-some registered) (err ERR-NOT-REGISTERED))
      (map-set metadata-uri tx-sender (some uri))
      (ok true))))

;; Guild management

(define-public (join-guild (guild principal))
  (begin
    (assert-not-paused)
    (let ((registered (map-get? impact-scores tx-sender)))
      (asserts! (is-some registered) (err ERR-NOT-REGISTERED))
      (let ((current (map-get? guild-membership tx-sender)))
        (asserts! (is-none current) (err ERR-ALREADY-IN-GUILD))
        (map-set guild-membership tx-sender (some guild))
        (map-set guild-membership-inverse { guild: guild, player: tx-sender } true)
        (ok true)))))

(define-public (leave-guild)
  (begin
    (assert-not-paused)
    (let ((current (map-get? guild-membership tx-sender)))
      (match current
        some (let ((g (unwrap current tx-sender)))
               (map-set guild-membership tx-sender none)
               (map-delete guild-membership-inverse { guild: g, player: tx-sender })
               (ok true))
        none (err ERR-NOT-IN-GUILD)))))

;; NFT linking

(define-public (link-nft (asset-contract principal) (token-id uint))
  (begin
    (assert-not-paused)
    ;; must be registered
    (let ((registered (map-get? impact-scores tx-sender)))
      (asserts! (is-some registered) (err ERR-NOT-REGISTERED))

      ;; load count
      (let ((count-entry (map-get? nft-counts tx-sender)))
        (let ((count (unwrap count-entry u0)))
          (asserts! (< count MAX-NFTS) (err ERR-NFT-LIMIT))

          ;; duplicate detection via named-let loop
          (let loop ((i ZERO))
            (if (>= i count)
                ;; not found, proceed to link
                (begin
                  (map-set linked-nft { player: tx-sender, idx: count } (tuple (asset-contract asset-contract) (token-id token-id)))
                  (map-set nft-counts tx-sender (uadd count ONE))
                  (ok true))
                (let ((entry (map-get? linked-nft { player: tx-sender, idx: i })))
                  (match entry
                    some (let ((t entry))
                           (if (and (is-eq asset-contract (get t asset-contract))
                                    (is-eq token-id (get t token-id)))
                               (err ERR-NFT-ALREADY-LINKED)
                               (loop (uadd i ONE))))
                    none (loop (uadd i ONE))))))))))

(define-public (unlink-nft (asset-contract principal) (token-id uint))
  (begin
    (assert-not-paused)
    (let ((count-entry (map-get? nft-counts tx-sender)))
      (match count-entry
        some (let ((count (unwrap count-entry u0)))
               ;; find index
               (let find-loop ((i ZERO) (found none))
                 (if (>= i count)
                     (match found
                       some (let ((idx (unwrap found u0)))
                              (let ((last-idx (sub count ONE)))
                                (if (is-eq idx last-idx)
                                    (begin
                                      (map-delete linked-nft { player: tx-sender, idx: idx })
                                      (map-set nft-counts tx-sender last-idx)
                                      (ok true))
                                    (let ((last-entry (map-get? linked-nft { player: tx-sender, idx: last-idx })))
                                      (match last-entry
                                        some (begin
                                               (map-set linked-nft { player: tx-sender, idx: idx } (unwrap last-entry (tuple (asset-contract 'SP000000000000000000002Q6VF78) (token-id u0))))
                                               (map-delete linked-nft { player: tx-sender, idx: last-idx })
                                               (map-set nft-counts tx-sender last-idx)
                                               (ok true)))
                                        none (err ERR-NFT-NOT-LINKED))))))
                       none (err ERR-NFT-NOT-LINKED))
                     (let ((entry (map-get? linked-nft { player: tx-sender, idx: i })))
                       (match entry
                         some (let ((t entry))
                                (if (and (is-eq asset-contract (get t asset-contract))
                                         (is-eq token-id (get t token-id)))
                                    (find-loop (uadd i ONE) (some i))
                                    (find-loop (uadd i ONE) found)))
                         none (find-loop (uadd i ONE) found))))))

        none (err ERR-NFT-NOT-LINKED)))))

;; Read-only accessors

(define-read-only (get-impact (player principal))
  (default-to u0 (map-get? impact-scores player)))

(define-read-only (get-metadata (player principal))
  (default-to (some (utf8 "")) (map-get? metadata-uri player)))

(define-read-only (get-guild (player principal))
  (default-to none (map-get? guild-membership player)))

(define-read-only (is-in-guild (player principal) (guild-principal principal))
  (let ((entry (map-get? guild-membership player)))
    (match entry
      some (is-eq guild-principal (unwrap entry guild-principal))
      none false)))

(define-read-only (get-nft-count (player principal))
  (default-to u0 (map-get? nft-counts player)))

(define-read-only (get-linked-nft (player principal) (idx uint))
  (map-get? linked-nft { player: player, idx: idx }))
