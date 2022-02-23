const { expect } = require("chai");
const { ethers, waffle} = require("hardhat");
const provider = waffle.provider;

describe("ERC20 compatibility", function () {

    let hardhatToken;
    let hardhatLottery;
    let beneficiary;
    let ticketPrice;
    let ticketSupply;
    let duration;
    let deploymentTime;
    let addr1;
    let addr2;
    let addrs;

    beforeEach(async function () {
        Token = await ethers.getContractFactory("LotToken");
        hardhatToken = await Token.deploy(BigInt(1e54));
        Lottery = await ethers.getContractFactory("EtherLottery");
        ticketPrice = 10;
        ticketSupply = 1000;
        duration = 3600;
        [beneficiary, addr1, addr2, ...addrs] = await ethers.getSigners();
        hardhatLottery = await Lottery.deploy(
            hardhatToken.address,
            ticketPrice,
            ticketSupply,
            duration);
        const blockNumBefore = await provider.getBlockNumber();
        const blockBefore = await provider.getBlock(blockNumBefore);
        deploymentTime = blockBefore.timestamp;
    });

});
