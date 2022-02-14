const { expect } = require("chai");
const { ethers, waffle} = require("hardhat");
const provider = waffle.provider;

describe("Lottery contract", function () {

    let Lottery;
    let hardhatLottery;
    let beneficiary;
    let ethTicketSupply;
    let duration;
    let deploymentTime;
    let addr1;
    let addr2;
    let addrs;

    beforeEach(async function () {
        ethTicketSupply = "1000";
        duration = 3600;
        Lottery = await ethers.getContractFactory("EtherLottery");
        [beneficiary, addr1, addr2, ...addrs] = await ethers.getSigners();
        hardhatLottery = await Lottery.deploy(
            ethers.utils.parseEther(ethTicketSupply),
            duration);
        const blockNumBefore = await provider.getBlockNumber();
        const blockBefore = await provider.getBlock(blockNumBefore);
        deploymentTime = blockBefore.timestamp;
    });

    describe("Deployment", function () {
        it("Should set the right beneficiary", async function () {
        expect(await hardhatLottery.beneficiary()).to.equal(beneficiary.address);
        });

        it("Should set the right ticket supply", async function () {
            expect(await hardhatLottery.ticketSupply()).to.equal(
                ethers.utils.parseEther(ethTicketSupply));
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
            const exceedingAmount = ethers.utils.parseEther((+ethTicketSupply + 1) + "");
            await expect(hardhatLottery.connect(addr1).buyTickets({value: exceedingAmount}))
            .to.be.revertedWith(`SentTooMuch(${ethers.utils.parseEther(ethTicketSupply)})`);
        });

        it("Should fail if a player tries to buy tickets after the lottery has ended", async function () {
            const halfOfTotalTicketAmount = ethers.utils.parseEther(Math.floor(+ethTicketSupply / 2) + "");
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

    describe("Ending lottery", function () {

        it("Should correctly calculate winner's and beneficiary's respective rewards", async function () {
            await hardhatLottery.connect(addr1).buyTickets({value: ethers.utils.parseEther(ethTicketSupply)});
            const [winnerReward, beneficiaryReward] = await hardhatLottery.getRewards();
            //The winner's reward should be 90% of the total reward.
            expect(winnerReward).to.equal(ethers.utils.parseEther(Math.floor(+ethTicketSupply * 0.9) + ""));
            //The winner's reward should be 10% of the total reward.
            expect(beneficiaryReward).to.equal(ethers.utils.parseEther(Math.ceil(+ethTicketSupply * 0.1) + ""));
        });

        it("Should randomly select the winner among the players and send rewards to him and the beneficiary", async function () {
            const potentialWinners = [addr1.address, addr2.address];
            const potentialWinnerBalances = [await provider.getBalance(addr1.address), await provider.getBalance(addr2.address)];
            const initialBeneficiaryBalance = await provider.getBalance(beneficiary.address);
            const halfOfTotalTicketAmount = Math.floor(ethTicketSupply / 2) + "";
            //Two players buy all of the tickets (each gets a half of the total amount).
            await hardhatLottery.connect(addr1).buyTickets({value: ethers.utils.parseEther(halfOfTotalTicketAmount)});
            await hardhatLottery.connect(addr2).buyTickets({value: ethers.utils.parseEther(halfOfTotalTicketAmount)});
            await hardhatLottery.endLottery();
            const winnerAddress = await hardhatLottery.getWinner();
            //Winner should be one of the two players that bought all of the tickets.
            expect(winnerAddress).to.be.oneOf([addr1.address, addr2.address]);

            const initialWinnerBalance = potentialWinnerBalances[potentialWinners.indexOf(winnerAddress)];
            const finalWinnerBalance = await provider.getBalance(winnerAddress);
            const finalBenificiaryBalance = await provider.getBalance(beneficiary.address);
            const lotteryEthBalance =  await provider.getBalance(hardhatLottery.address);
            // Winner's ethereum balance shoud be above his initial balance.
            expect(finalWinnerBalance).to.be.above(initialWinnerBalance)
            // Beneficiary's ethereum balance shoud be above his initial balance.
            expect(finalBenificiaryBalance).to.be.above(initialBeneficiaryBalance)
            // The contract balance should be equal to zero.
            expect(lotteryEthBalance).to.equal(0);
        });

        it("Should fail if a player tries to end the lottery before all of the tickets have been sold", async function () {
            const halfOfTotalTicketAmount = ethers.utils.parseEther(Math.floor(+ethTicketSupply / 2) + "");
            await hardhatLottery.connect(addr1).buyTickets({value: halfOfTotalTicketAmount});
            // Only a half of the total ticket amount has been bought.
            await expect(hardhatLottery.endLottery()).to.be.revertedWith("LotteryNotYetEnded");
        });

        it("Should not fail if a player tries to end the lottery after the ticket buying period is over", async function () {
            const halfOfTotalTicketAmount = ethers.utils.parseEther(Math.floor(+ethTicketSupply / 2) + "");
            await hardhatLottery.connect(addr1).buyTickets({value: halfOfTotalTicketAmount});
            //Fast forward to the end of the ticket buying period.
            await network.provider.send("evm_increaseTime", [duration + 1])
            // Only a half of the total ticket amount has been bought,
            // but the ticket buying period has ended.
            await expect(hardhatLottery.endLottery()).to.not.be.reverted;
        });

        it("Should fail if a player tries to end the lottery that has already ended", async function () {
            const halfOfTotalTicketAmount = ethers.utils.parseEther(Math.floor(ethTicketSupply / 2) + "");
            await hardhatLottery.connect(addr1).buyTickets({value: halfOfTotalTicketAmount});
            await hardhatLottery.connect(addr2).buyTickets({value: halfOfTotalTicketAmount});
            // The end of the lottery.
            await hardhatLottery.endLottery();
            // The lottery can not be ended twice.
            await expect(hardhatLottery.endLottery()).to.be.revertedWith("LotteryEndAlreadyCalled");
        });

        it("Should emit an event containing the winner's address and reward", async function () {
            await hardhatLottery.connect(addr1).buyTickets({value: ethers.utils.parseEther(ethTicketSupply)});
            await expect(hardhatLottery.endLottery()).to.emit(hardhatLottery, 'LotteryEnded')
            .withArgs(addr1.address, ethers.utils.parseEther(Math.floor(+ethTicketSupply * 0.9) + ""));
        });
    });

});
