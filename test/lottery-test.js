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

    describe("Buying tickets", function () {
        it("Should increase player's ticket balance by the amount of ether sent", async function () {
            const requestedTickets = ethers.utils.parseEther("1")
            await hardhatLottery.connect(addr1).buyTickets({value: requestedTickets});
            const playerTickets = await hardhatLottery.connect(addr1).getTicketAmount();
            const lotteryEthBalance =  await provider.getBalance(hardhatLottery.address);
            // The requested amount of tickets and the player's current ticket amount should match.
            expect(playerTickets).to.equal(requestedTickets);
            // The contract balance should have been increased by the amount of requested tickets.
            expect(lotteryEthBalance).to.equal(requestedTickets);
        });

        it("Should update player's ticket balance if the player buys more tickets", async function () {
            const requestedTickets = ethers.utils.parseEther("1")
            await hardhatLottery.connect(addr1).buyTickets({value: requestedTickets});
            const initialPlayerTickets = await hardhatLottery.connect(addr1).getTicketAmount();
            // The requested amount of tickets and the player's current ticket amount should match.
            expect(initialPlayerTickets).to.equal(requestedTickets);

            await hardhatLottery.connect(addr1).buyTickets({value: requestedTickets});
            const finalPlayerTickets = await hardhatLottery.connect(addr1).getTicketAmount();
            const lotteryEthBalance =  await provider.getBalance(hardhatLottery.address);
            // Player's current ticket amount should have been updated.
            expect(finalPlayerTickets).to.equal(ethers.utils.parseEther("2"));
            // The contract balance should have been increased by the amount of requested tickets.
            expect(lotteryEthBalance).to.equal(ethers.utils.parseEther("2"));
        });

        it("Should fail if a player tries to buy zero tickets", async function () {
            await expect(hardhatLottery.connect(addr1).buyTickets({value: ethers.utils.parseEther("0")}))
            .to.be.revertedWith("NoEtherSent");
        });

        it("Should fail  if a player tries to buy more tickets than currently available", async function () {
            const exceedingAmount = ethers.utils.parseEther(ethers.utils.formatEther(ticketSupply) + 1 + "");
            await expect(hardhatLottery.connect(addr1).buyTickets({value: exceedingAmount}))
            .to.be.revertedWith(`SentTooMuch(${ticketSupply})`);
        });

        it("Should fail if a player tries to buy tickets after the lottery has ended", async function () {
            const halfOfTotalTicketAmount = Math.floor(+ticketSupply / 2) + "";
            //Two players buy all of the tickets (each gets a half of the total amount).
            await hardhatLottery.connect(addr1).buyTickets({value: halfOfTotalTicketAmount});
            await hardhatLottery.connect(addr2).buyTickets({value: halfOfTotalTicketAmount});
            await hardhatLottery.endLottery();
            await expect(hardhatLottery.connect(addr1).buyTickets({value: ethers.utils.parseEther("1")}))
            .to.be.revertedWith("LotteryAlreadyEnded");
        });

        it("Should fail if a player tries to buy tickets after the ticket buying period is over", async function () {
            //Fast forward to the end of the ticket buying period.
            await network.provider.send("evm_increaseTime", [duration + 1])
            await expect(hardhatLottery.connect(addr1).buyTickets({value: ethers.utils.parseEther("1")}))
            .to.be.revertedWith("LotteryAlreadyEnded");
        });
    });

});
