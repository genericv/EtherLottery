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
        hardhatToken.transfer(addr1.address, ticketSupply * 2 * ticketPrice);
        hardhatToken.transfer(addr2.address, ticketSupply * 2 * ticketPrice);
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
            console.log("check");
            expect(ticketsLeft).to.equal(expectedTicketsLeft);
        });
    });

});
