const { expect } = require("chai");
const { ethers, waffle} = require("hardhat");
const provider = waffle.provider;

describe("Lottery contract", function () {

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
        hardhatToken = await Token.deploy(BigInt(1e21));
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
        hardhatToken.transfer(addr1.address, ticketSupply * 2 * ticketPrice);
        hardhatToken.transfer(addr2.address, ticketSupply * 2 * ticketPrice);
    });

    describe("Deployment", function () {
        it("Should set the right beneficiary", async function () {
            expect(await hardhatLottery.beneficiary()).to.equal(beneficiary.address);
        });

        it("Should set the right end time", async function () {
            expect(await hardhatLottery.tokenContractAddress()).to.equal(hardhatToken.address);
        });

        it("Should set the right ticket supply", async function () {
            expect(await hardhatLottery.ticketSupply()).to.equal(ticketSupply);
        });

        it("Should set the right ticket price", async function () {
            expect(await hardhatLottery.ticketPrice()).to.equal(ticketPrice);
        });

        it("Should set the right ticket price", async function () {
            expect(await hardhatLottery.ticketPool()).to.equal(ticketSupply);
        });

        it("Should set the right end time", async function () {
            expect(await hardhatLottery.endTime()).to.equal(deploymentTime + duration);
        });
    });

    describe("Buying tickets", function () {
        it("Should increase player's ticket balance", async function () {
            const requestedTickets = 10;
            await hardhatToken.connect(addr1).buyLotteryTickets(hardhatLottery.address, requestedTickets);

            const playerTickets = await hardhatLottery.connect(addr1).getTicketAmount();
            const lotteryBalance =  await hardhatToken.balanceOf(hardhatLottery.address);
            // The requested amount of tickets and the player's current ticket balance should match.
            expect(playerTickets).to.equal(requestedTickets);
            // The contract token balance should have been increased by the amount of requested tickets.
            expect(lotteryBalance).to.equal(requestedTickets*ticketPrice);

            const ticketsLeft = await hardhatLottery.ticketPool();
            const expectedTicketsLeft = ticketSupply - requestedTickets;
            // The ticket pool should have been decreased by the amount of requested tickets.
            expect(ticketsLeft).to.equal(expectedTicketsLeft);
        });

        it("Should update player's ticket balance if the player buys more tickets", async function () {
            const requestedTickets = 10;
            await hardhatToken.connect(addr1).buyLotteryTickets(hardhatLottery.address, requestedTickets);

            const initialPlayerTickets = await hardhatLottery.connect(addr1).getTicketAmount();
            // The requested amount of tickets and the player's current ticket amount should match.
            expect(initialPlayerTickets).to.equal(requestedTickets);

            await hardhatToken.connect(addr1).buyLotteryTickets(hardhatLottery.address, requestedTickets);
            const finalPlayerTickets = await hardhatLottery.connect(addr1).getTicketAmount();
            const lotteryBalance =  await hardhatToken.balanceOf(hardhatLottery.address);
            // Player's current ticket amount should have been updated.
            expect(finalPlayerTickets).to.equal(requestedTickets * 2);
            // The contract balance should have been increased by the amount of requested tickets.
            expect(lotteryBalance).to.equal(requestedTickets * ticketPrice * 2);

            const ticketsLeft = await hardhatLottery.ticketPool();
            const expectedTicketsLeft = ticketSupply - requestedTickets * 2;
            // The ticket pool should have been decreased by the amount of requested tickets.
            expect(ticketsLeft).to.equal(expectedTicketsLeft);
        });

        it("Should fail if a player tries to buy zero tickets", async function () {
            await expect(hardhatToken.connect(addr1).buyLotteryTickets(hardhatLottery.address, 0))
            .to.be.revertedWith("Can not transfer zero tokens.");
        });

        it("Should fail  if a player tries to buy more tickets than currently available", async function () {
            const exceedingAmount = ticketSupply + 1;
            await expect(hardhatToken.connect(addr1).buyLotteryTickets(hardhatLottery.address, exceedingAmount))
            .to.be.revertedWith("The requested number of tickets exceeds current available count.");
        });

        it("Should fail if a player tries to buy tickets after the lottery has ended", async function () {
            const halfOfTotalTicketAmount = ticketSupply / 2;
            //Two players buy all of the tickets (each gets a half of the total amount).
            await hardhatToken.connect(addr1).buyLotteryTickets(hardhatLottery.address, halfOfTotalTicketAmount);
            await hardhatToken.connect(addr2).buyLotteryTickets(hardhatLottery.address, halfOfTotalTicketAmount);
            // The end of the lottery.
            await hardhatLottery.endLottery();
            await expect(hardhatToken.connect(addr1).buyLotteryTickets(hardhatLottery.address, 1))
            .to.be.revertedWith("The lottery has already ended.");
        });

        it("Should fail if a player tries to buy tickets after the ticket buying period is over", async function () {
            //Fast forward to the end of the ticket buying period.
            await network.provider.send("evm_increaseTime", [duration + 1]);
            await expect(hardhatToken.connect(addr1).buyLotteryTickets(hardhatLottery.address, 1))
            .to.be.revertedWith("The ticket buying period has already ended.");
        });

        it("Should fail if a player doesn't have enough tokens for a purchase", async function () {
            await expect(hardhatToken.connect(addrs[0]).buyLotteryTickets(hardhatLottery.address, 1))
            .to.be.revertedWith("Not enough tokens.");
        });

    });

    describe("Ending lottery", function () {

        it("Should correctly calculate winner's and beneficiary's respective rewards", async function () {
            await hardhatToken.connect(addr1).buyLotteryTickets(hardhatLottery.address, ticketSupply);
            const [winnerReward, beneficiaryReward] = await hardhatLottery.getRewards();
            //The winner's reward should be 90% of the total reward.
            expect(winnerReward).to.equal(ticketSupply * 0.9 * ticketPrice);
            //The winner's reward should be 10% of the total reward.
            expect(beneficiaryReward).to.equal(ticketSupply * 0.1 * ticketPrice);
        });

        it("Should randomly select the winner among the players and send rewards to him and the beneficiary", async function () {
            const potentialWinners = [addr1.address, addr2.address];
            const halfOfTotalTicketAmount = ticketSupply / 2;
            //Two players buy all of the tickets (each gets a half of the total amount).
            await hardhatToken.connect(addr1).buyLotteryTickets(hardhatLottery.address, halfOfTotalTicketAmount);
            await hardhatToken.connect(addr2).buyLotteryTickets(hardhatLottery.address, halfOfTotalTicketAmount);
            const potentialWinnerBalances = [await hardhatToken.balanceOf(addr1.address), await hardhatToken.balanceOf(addr1.address)];
            const initialBeneficiaryBalance = await hardhatToken.balanceOf(beneficiary.address);
            await hardhatLottery.endLottery();
            const winnerAddress = await hardhatLottery.getWinner();
            //Winner should be one of the two players that bought all of the tickets.
            expect(winnerAddress).to.be.oneOf([addr1.address, addr2.address]);

            const [winnerReward, beneficiaryReward] = await hardhatLottery.getRewards();
            const initialWinnerBalance = potentialWinnerBalances[potentialWinners.indexOf(winnerAddress)];
            const finalWinnerBalance = await hardhatToken.balanceOf(winnerAddress);
            const finalBenificiaryBalance = await hardhatToken.balanceOf(beneficiary.address);
            const lotteryBalance =  await hardhatToken.balanceOf(hardhatLottery.address);
            // Winner's token balance shoud be increased by his reward.
            expect(finalWinnerBalance).to.equal(initialWinnerBalance.add(winnerReward));
            // Beneficiary's token balance shoud be increased by his reward.
            expect(finalBenificiaryBalance).to.equal(initialBeneficiaryBalance.add(beneficiaryReward));
            // The contract token balance should be equal to zero.
            expect(lotteryBalance).to.equal(0);
        });

        it("Should fail if a player tries to end the lottery before all of the tickets have been sold", async function () {
            const halfOfTotalTicketAmount = ticketSupply / 2;
            await hardhatToken.connect(addr1).buyLotteryTickets(hardhatLottery.address, halfOfTotalTicketAmount);
            // Only a half of the total ticket amount has been bought.
            await expect(hardhatLottery.endLottery()).to.be.revertedWith("The lottery has not ended yet.");
        });

        it("Should not fail if a player tries to end the lottery after the ticket buying period is over", async function () {
            const halfOfTotalTicketAmount = ticketSupply / 2;
            await hardhatToken.connect(addr1).buyLotteryTickets(hardhatLottery.address, halfOfTotalTicketAmount);
            //Fast forward to the end of the ticket buying period.
            await network.provider.send("evm_increaseTime", [duration + 1]);
            // Only a half of the total ticket amount has been bought,
            // but the ticket buying period has ended.
            await hardhatLottery.endLottery()
        });

        it("Should fail if a player tries to end the lottery that has already ended", async function () {
            const halfOfTotalTicketAmount = ticketSupply / 2;
            //Two players buy all of the tickets (each gets a half of the total amount).
            await hardhatToken.connect(addr1).buyLotteryTickets(hardhatLottery.address, halfOfTotalTicketAmount);
            await hardhatToken.connect(addr2).buyLotteryTickets(hardhatLottery.address, halfOfTotalTicketAmount);
            // The end of the lottery.
            await hardhatLottery.endLottery();
            // The lottery can not be ended twice.
            await expect(hardhatLottery.endLottery()).to.be.revertedWith("The lottery ending has already been requested.");
        });

        it("Should emit an event containing the winner's address and reward", async function () {
            await hardhatToken.connect(addr1).buyLotteryTickets(hardhatLottery.address, ticketSupply);
            await expect(hardhatLottery.endLottery()).to.emit(hardhatLottery, 'LotteryEnded')
            .withArgs(addr1.address, ticketSupply * 0.9 * ticketPrice);
        });
    });

});
