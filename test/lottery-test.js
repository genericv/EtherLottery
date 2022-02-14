const { expect } = require("chai");
const { ethers, waffle} = require("hardhat");
const provider = waffle.provider;

describe("Lottery contract", function () {

    let Lottery;
    let hardhatLottery;
    let beneficiary;
    let ticketSupply;
    let duration;
    let deploymentTime;
    let addr1;
    let addr2;
    let addrs;

    beforeEach(async function () {
        ticketSupply = ethers.utils.parseEther("1000");
        duration = 3600;
        Lottery = await ethers.getContractFactory("EtherLottery");
        [beneficiary, addr1, addr2, ...addrs] = await ethers.getSigners();
        hardhatLottery = await Lottery.deploy(ticketSupply, duration);
        const blockNumBefore = await provider.getBlockNumber();
        const blockBefore = await provider.getBlock(blockNumBefore);
        deploymentTime = blockBefore.timestamp;
    });

    describe("Deployment", function () {
        it("Should set the right beneficiary", async function () {
        expect(await hardhatLottery.beneficiary()).to.equal(beneficiary.address);
        });

        it("Should set the right ticket supply", async function () {
            expect(await hardhatLottery.ticketSupply()).to.equal(ticketSupply);
        });

        it("Should set the right end time", async function () {
            expect(await hardhatLottery.endTime()).to.equal(deploymentTime + duration);
        });
    });

});
