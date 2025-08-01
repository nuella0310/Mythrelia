# Mythrelia

A blockchain-based, real-world impact RPG that rewards players for completing environmental actions. Players gain NFT heroes, resources, and powers by performing verifiable eco-friendly tasks, contributing to a sustainable future while enjoying a strategic, lore-driven experience.

---

## Overview

This system consists of ten main smart contracts that manage gameplay, real-world verification, assets, and governance:

1. **Player Profile Contract** – Stores player identity, guilds, and impact scores  
2. **Quest & Mission Contract** – Manages real-world environmental quests and in-game missions  
3. **NFT Asset Contract** – Mints and manages hero, weapon, and relic NFTs  
4. **Resource Token Contract** – Handles fungible in-game currency for trading and crafting  
5. **Guild & Territory Contract** – Manages guild creation, territory control, and PvP leaderboards  
6. **Verification Oracle Contract** – Validates real-world environmental actions via oracles/community voting  
7. **Marketplace Contract** – Enables NFT and resource token trading in a decentralized manner  
8. **Treasury & DAO Contract** – Governs community funds and supports eco-projects through proposals and voting  
9. **Staking & Rewards Contract** – Provides incentives for holding NFTs and completing eco-actions  
10. **Dynamic Story Contract** – Unlocks new regions, lore, and events as community milestones are achieved  

---

## Features

- **Environmental Impact Rewards** – Real-world actions lead to in-game progression  
- **Fully Tokenized Economy** – NFT assets and fungible tokens for resources and rewards  
- **Decentralized Governance** – DAO manages eco-funding and gameplay evolution  
- **Player-Owned Assets** – All heroes, relics, and territories are tokenized  
- **Cross-Reality Gameplay** – Connects real-world environmental actions to virtual strategy mechanics  
- **Marketplace Integration** – Fully on-chain NFT and token trading  
- **Gamified Sustainability** – Encourages global eco-awareness and participation  

---

## Smart Contracts

### **Player Profile Contract**
- Tracks player wallet, guild membership, and sustainability score  
- Links to NFTs and in-game resources  

### **Quest & Mission Contract**
- Creates and manages on-chain quests and missions  
- Verifies mission completion via oracle input  

### **NFT Asset Contract**
- Mints unique hero and relic NFTs (ERC-721/1155)  
- Supports upgrade and evolution mechanics  

### **Resource Token Contract**
- Provides fungible tokens for crafting, trading, and rewards  
- Integrates with staking and quest rewards  

### **Guild & Territory Contract**
- Manages territory battles, guild formation, and PvP scoring  
- Allows on-chain voting for territory disputes  

### **Verification Oracle Contract**
- Accepts and validates environmental proof submissions  
- Uses staking or community voting for authenticity  

### **Marketplace Contract**
- Facilitates NFT and token sales, auctions, and trades  
- Supports royalties for eco-project funding  

### **Treasury & DAO Contract**
- Stores community funds and eco-grants  
- Implements DAO voting for fund allocation and updates  

### **Staking & Rewards Contract**
- Rewards long-term asset holders and quest participants  
- Supports periodic eco-event bonuses  

### **Dynamic Story Contract**
- Unlocks new events and maps as players meet community goals  
- On-chain story progression linked to real-world impact  

---

## Installation

1. Install [Clarinet CLI](https://github.com/hirosystems/clarinet)  
2. Clone this repository  
3. Install dependencies:  
   ```bash
   npm install
   ```
4. Run tests:
    ```bash
    npm test
    ```
5. Deploy contracts:
    ```bash
    clarinet deploy
    ```

## Usage

Each contract can be deployed independently and provides isolated functionality.
Refer to individual contract documentation for:

- Deployment steps
- Function descriptions
- Example transactions

## Testing

Tests are written using Vitest and can be executed with:
    ```bash
    npm test
    ```

## License

MIT License