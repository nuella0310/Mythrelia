import { describe, it, expect, beforeEach } from "vitest"

type Principal = string

/** Error codes matching clarity contract */
const ERR = {
  NOT_AUTHORIZED: 100,
  ALREADY_REGISTERED: 101,
  NOT_REGISTERED: 102,
  ALREADY_IN_GUILD: 103,
  NOT_IN_GUILD: 104,
  PAUSED: 105,
  NFT_ALREADY_LINKED: 107,
  NFT_NOT_LINKED: 108,
  NFT_LIMIT: 109,
} as const

type Result<T> = { value: T } | { error: number }

interface LinkedNFT {
  assetContract: Principal
  tokenId: number
}

interface PlayerProfileState {
  admin: Principal
  paused: boolean
  impactScores: Map<Principal, number>
  metadata: Map<Principal, string>
  guildMembership: Map<Principal, Principal | null>
  guildInverse: Map<string, boolean> // key `${guild}:${player}`
  linkedNFTs: Map<Principal, LinkedNFT[]>
  nftCounts: Map<Principal, number>
}

class MockPlayerProfile {
  state: PlayerProfileState

  static MAX_NFTS = 10

  constructor(initialAdmin: Principal) {
    this.state = {
      admin: initialAdmin,
      paused: false,
      impactScores: new Map(),
      metadata: new Map(),
      guildMembership: new Map(),
      guildInverse: new Map(),
      linkedNFTs: new Map(),
      nftCounts: new Map(),
    }
  }

  private ensureRegistered(player: Principal): Result<null> {
    if (!this.state.impactScores.has(player)) return { error: ERR.NOT_REGISTERED }
    return { value: null }
  }

  transferAdmin(caller: Principal, newAdmin: Principal): Result<boolean> {
    if (caller !== this.state.admin) return { error: ERR.NOT_AUTHORIZED }
    this.state.admin = newAdmin
    return { value: true }
  }

  setPause(caller: Principal, shouldPause: boolean): Result<boolean> {
    if (caller !== this.state.admin) return { error: ERR.NOT_AUTHORIZED }
    this.state.paused = shouldPause
    return { value: shouldPause }
  }

  registerPlayer(caller: Principal): Result<boolean> {
    if (this.state.paused) return { error: ERR.PAUSED }
    if (this.state.impactScores.has(caller)) return { error: ERR.ALREADY_REGISTERED }
    this.state.impactScores.set(caller, 0)
    this.state.metadata.set(caller, "default")
    this.state.guildMembership.set(caller, null)
    this.state.linkedNFTs.set(caller, [])
    this.state.nftCounts.set(caller, 0)
    return { value: true }
  }

  addImpact(caller: Principal, delta: number): Result<number> {
    if (this.state.paused) return { error: ERR.PAUSED }
    if (!this.state.impactScores.has(caller)) return { error: ERR.NOT_REGISTERED }
    const current = this.state.impactScores.get(caller)! + delta
    this.state.impactScores.set(caller, current)
    return { value: current }
  }

  setMetadata(caller: Principal, uri: string): Result<boolean> {
    if (this.state.paused) return { error: ERR.PAUSED }
    if (!this.state.impactScores.has(caller)) return { error: ERR.NOT_REGISTERED }
    this.state.metadata.set(caller, uri)
    return { value: true }
  }

  joinGuild(caller: Principal, guild: Principal): Result<boolean> {
    if (this.state.paused) return { error: ERR.PAUSED }
    if (!this.state.impactScores.has(caller)) return { error: ERR.NOT_REGISTERED }
    if (this.state.guildMembership.get(caller)) return { error: ERR.ALREADY_IN_GUILD }
    this.state.guildMembership.set(caller, guild)
    this.state.guildInverse.set(`${guild}:${caller}`, true)
    return { value: true }
  }

  leaveGuild(caller: Principal): Result<boolean> {
    if (this.state.paused) return { error: ERR.PAUSED }
    const guild = this.state.guildMembership.get(caller)
    if (!guild) return { error: ERR.NOT_IN_GUILD }
    this.state.guildMembership.set(caller, null)
    this.state.guildInverse.delete(`${guild}:${caller}`)
    return { value: true }
  }

  linkNFT(caller: Principal, assetContract: Principal, tokenId: number): Result<boolean> {
    if (this.state.paused) return { error: ERR.PAUSED }
    if (!this.state.impactScores.has(caller)) return { error: ERR.NOT_REGISTERED }
    const linked = this.state.linkedNFTs.get(caller)!
    if (linked.length >= MockPlayerProfile.MAX_NFTS) return { error: ERR.NFT_LIMIT }
    if (linked.some(n => n.assetContract === assetContract && n.tokenId === tokenId)) {
      return { error: ERR.NFT_ALREADY_LINKED }
    }
    linked.push({ assetContract, tokenId })
    this.state.nftCounts.set(caller, linked.length)
    return { value: true }
  }

  unlinkNFT(caller: Principal, assetContract: Principal, tokenId: number): Result<boolean> {
    if (this.state.paused) return { error: ERR.PAUSED }
    const linked = this.state.linkedNFTs.get(caller)
    if (!linked) return { error: ERR.NFT_NOT_LINKED }
    const idx = linked.findIndex(n => n.assetContract === assetContract && n.tokenId === tokenId)
    if (idx === -1) return { error: ERR.NFT_NOT_LINKED }
    // swap-remove
    const last = linked.pop()!
    if (idx < linked.length) {
      linked[idx] = last
    }
    this.state.nftCounts.set(caller, linked.length)
    return { value: true }
  }

  // Read-only
  getImpact(player: Principal): number {
    return this.state.impactScores.get(player) ?? 0
  }

  getMetadata(player: Principal): string {
    return this.state.metadata.get(player) ?? ""
  }

  getGuild(player: Principal): Principal | null {
    return this.state.guildMembership.get(player) ?? null
  }

  isInGuild(player: Principal, guild: Principal): boolean {
    return this.state.guildInverse.get(`${guild}:${player}`) ?? false
  }

  getLinkedNFTs(player: Principal): LinkedNFT[] {
    return [...(this.state.linkedNFTs.get(player) ?? [])]
  }

  getNFTCount(player: Principal): number {
    return this.state.nftCounts.get(player) ?? 0
  }
}

describe("Player Profile Contract Mock (Mythrelia)", () => {
  const admin = "ST1ADMIN000000000000000000000000000000000"
  const player = "ST1PLAYER00000000000000000000000000000000"
  const anotherPlayer = "ST1PLAYER22222222222222222222222222222222"
  const guildA = "ST1GUILDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
  const nftContract = "ST1NFTCONTRACT000000000000000000000000000"
  let contract: MockPlayerProfile

  beforeEach(() => {
    contract = new MockPlayerProfile(admin)
  })

  it("allows admin to register a player and initializes state", () => {
    const res = contract.registerPlayer(player)
    expect(res).toEqual({ value: true })
    expect(contract.getImpact(player)).toBe(0)
    expect(contract.getMetadata(player)).toBe("default")
    expect(contract.getGuild(player)).toBeNull()
    expect(contract.getNFTCount(player)).toBe(0)
  })

  it("prevents double registration", () => {
    contract.registerPlayer(player)
    const res = contract.registerPlayer(player)
    expect(res).toEqual({ error: ERR.ALREADY_REGISTERED })
  })

  it("updates impact only for registered player", () => {
    const unreg = contract.addImpact(player, 5)
    expect(unreg).toEqual({ error: ERR.NOT_REGISTERED })

    contract.registerPlayer(player)
    const r1 = contract.addImpact(player, 5)
    expect(r1).toEqual({ value: 5 })
    const r2 = contract.addImpact(player, 3)
    expect(r2).toEqual({ value: 8 })
    expect(contract.getImpact(player)).toBe(8)
  })

  it("sets metadata appropriately", () => {
    contract.registerPlayer(player)
    const res = contract.setMetadata(player, "https://profile.mythrelia/hero123")
    expect(res).toEqual({ value: true })
    expect(contract.getMetadata(player)).toBe("https://profile.mythrelia/hero123")
  })

  it("manages guild join and leave correctly", () => {
    contract.registerPlayer(player)
    const joinRes = contract.joinGuild(player, guildA)
    expect(joinRes).toEqual({ value: true })
    expect(contract.getGuild(player)).toBe(guildA)
    expect(contract.isInGuild(player, guildA)).toBe(true)

    const leaveRes = contract.leaveGuild(player)
    expect(leaveRes).toEqual({ value: true })
    expect(contract.getGuild(player)).toBeNull()
    expect(contract.isInGuild(player, guildA)).toBe(false)
  })

  it("prevents joining a second time without leaving", () => {
    contract.registerPlayer(player)
    contract.joinGuild(player, guildA)
    const res = contract.joinGuild(player, guildA)
    expect(res).toEqual({ error: ERR.ALREADY_IN_GUILD })
  })

  it("prevents leaving when not in a guild", () => {
    contract.registerPlayer(player)
    const res = contract.leaveGuild(player)
    expect(res).toEqual({ error: ERR.NOT_IN_GUILD })
  })

  it("links and unlinks NFTs respecting limits and duplicates", () => {
    contract.registerPlayer(player)
    // link one
    const link1 = contract.linkNFT(player, nftContract, 101)
    expect(link1).toEqual({ value: true })
    expect(contract.getNFTCount(player)).toBe(1)
    expect(contract.getLinkedNFTs(player)).toContainEqual({ assetContract: nftContract, tokenId: 101 })

    // duplicate should fail
    const dup = contract.linkNFT(player, nftContract, 101)
    expect(dup).toEqual({ error: ERR.NFT_ALREADY_LINKED })

    // fill to limit
    for (let i = 0; i < MockPlayerProfile.MAX_NFTS - 1; i++) {
      const res = contract.linkNFT(player, nftContract, 200 + i)
      expect(res).toEqual({ value: true })
    }
    expect(contract.getNFTCount(player)).toBe(MockPlayerProfile.MAX_NFTS)

    const overflow = contract.linkNFT(player, nftContract, 999)
    expect(overflow).toEqual({ error: ERR.NFT_LIMIT })

    // unlink middle item
    const unlink = contract.unlinkNFT(player, nftContract, 101)
    expect(unlink).toEqual({ value: true })
    expect(contract.getNFTCount(player)).toBe(MockPlayerProfile.MAX_NFTS - 1)
    expect(contract.getLinkedNFTs(player).some(n => n.tokenId === 101)).toBe(false)

    // unlink non-existent fails
    const badUnlink = contract.unlinkNFT(player, nftContract, 9999)
    expect(badUnlink).toEqual({ error: ERR.NFT_NOT_LINKED })
  })

  it("pauses and blocks state-changing operations", () => {
    contract.registerPlayer(player)
    const pauseRes = contract.setPause(admin, true)
    expect(pauseRes).toEqual({ value: true })

    const impact = contract.addImpact(player, 1)
    expect(impact).toEqual({ error: ERR.PAUSED })

    const join = contract.joinGuild(player, guildA)
    expect(join).toEqual({ error: ERR.PAUSED })

    const link = contract.linkNFT(player, nftContract, 55)
    expect(link).toEqual({ error: ERR.PAUSED })
  })

  it("admin transfer works and new admin can act", () => {
    const newAdmin = "ST1NEWADMIN0000000000000000000000000000000"
    const transfer = contract.transferAdmin(admin, newAdmin)
    expect(transfer).toEqual({ value: true })

    // old admin cannot pause anymore
    const oldPause = contract.setPause(admin, true)
    expect(oldPause).toEqual({ error: ERR.NOT_AUTHORIZED })

    // new admin pauses
    const newPause = contract.setPause(newAdmin, true)
    expect(newPause).toEqual({ value: true })
  })

  it("non-admin cannot transfer admin or set pause", () => {
    const attacker = anotherPlayer
    const badTransfer = contract.transferAdmin(attacker, "ST1WHOEVER000000000000000000000000000")
    expect(badTransfer).toEqual({ error: ERR.NOT_AUTHORIZED })

    const badPause = contract.setPause(attacker, true)
    expect(badPause).toEqual({ error: ERR.NOT_AUTHORIZED })
  })
})
