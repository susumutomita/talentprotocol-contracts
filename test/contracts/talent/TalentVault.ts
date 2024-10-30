import chai from "chai";
import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TalentProtocolToken, TalentVault, PassportRegistry, PassportBuilderScore } from "../../../typechain-types";
import { Artifacts } from "../../shared";
import { TalentVault as TalentVaultArtifact } from "../../shared/artifacts";
import { talent } from "../../../typechain-types/contracts";

chai.use(solidity);

const { expect } = chai;
const { deployContract } = waffle;

describe("TalentVault", () => {
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  let talentToken: TalentProtocolToken;
  let passportRegistry: PassportRegistry;
  let passportBuilderScore: PassportBuilderScore;
  let talentVault: TalentVault;

  beforeEach(async () => {
    [admin, user1, user2, user3] = await ethers.getSigners();

    talentToken = (await deployContract(admin, Artifacts.TalentProtocolToken, [admin.address])) as TalentProtocolToken;
    passportRegistry = (await deployContract(admin, Artifacts.PassportRegistry, [admin.address])) as PassportRegistry;
    passportBuilderScore = (await deployContract(admin, Artifacts.PassportBuilderScore, [
      passportRegistry.address,
      admin.address,
    ])) as PassportBuilderScore;

    const adminInitialDeposit = ethers.utils.parseEther("20000");
    talentVault = (await deployContract(admin, Artifacts.TalentVault, [
      talentToken.address,
      admin.address,
      ethers.utils.parseEther("10000"),
      passportBuilderScore.address,
      // adminInitialDeposit,
    ])) as TalentVault;

    console.log("------------------------------------");
    console.log("Addresses:");
    console.log(`admin = ${admin.address}`);
    console.log(`user1 = ${user1.address}`);
    console.log(`user2 = ${user2.address}`);
    console.log(`user3 = ${user3.address}`);
    console.log(`talentToken = ${talentToken.address}`);
    console.log(`talentVault = ${talentVault.address}`);
    console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

    // Approve TalentVault contract to spend tokens on behalf of the admin
    const totalAllowance = ethers.utils.parseUnits("600000000", 18);
    await talentToken.approve(talentVault.address, totalAllowance);
    await talentToken.unpause();

    // just make sure that TV wallet has $TALENT as initial assets from admin initial deposit
    await talentToken.approve(talentVault.address, adminInitialDeposit);
    await talentVault.mint(adminInitialDeposit, admin.address);

    // await talentToken.renounceOwnership();
  });

  describe("Deployment", () => {
    it("Should set the right owner", async () => {
      expect(await talentVault.owner()).not.to.equal(ethers.constants.AddressZero);
      expect(await talentVault.owner()).to.equal(admin.address);
    });

    it("Should set the correct initial values", async () => {
      expect(await talentVault.yieldRateBase()).to.equal(10_00);
      expect(await talentVault.yieldRateProficient()).to.equal(15_00);
      expect(await talentVault.yieldRateCompetent()).to.equal(20_00);
      expect(await talentVault.yieldRateExpert()).to.equal(25_00);

      expect(await talentVault.maxYieldAmount()).to.equal(ethers.utils.parseEther("10000"));

      expect(await talentVault.passportBuilderScore()).not.to.equal(ethers.constants.AddressZero);
      expect(await talentVault.passportBuilderScore()).to.equal(passportBuilderScore.address);
    });

    it("reverts with InvalidAddress when _token given is 0", async () => {
      await expect(
        deployContract(admin, Artifacts.TalentVault, [
          ethers.constants.AddressZero,
          admin.address,
          ethers.utils.parseEther("500000"),
          passportBuilderScore.address,
        ])
      ).to.be.reverted;
    });

    it("reverts with InvalidAddress when _yieldSource given is 0", async () => {
      await expect(
        deployContract(admin, Artifacts.TalentVault, [
          talentToken.address,
          ethers.constants.AddressZero,
          ethers.utils.parseEther("500000"),
          passportBuilderScore.address,
        ])
      ).to.be.reverted;
    });

    it("reverts with InvalidAddress when _passportBuilderScore given is 0", async () => {
      await expect(
        deployContract(admin, Artifacts.TalentVault, [
          talentToken.address,
          admin.address,
          ethers.utils.parseEther("500000"),
          ethers.constants.AddressZero,
        ])
      ).to.be.reverted;
    });
  });

  // TODO: Do we want this? Does it
  // depreciate the reliability of the contract at
  // the eyes of our users?
  //
  describe("Pausable", async () => {
    it("is Pausable");
    it("when Pausable, we cannot deposit");
    it("when Pausable, we cannot withdraw");
    it("when paused we cannot .... other ...");
    it("can be paused only by the owner");
    it("can be unpaused only by the owner");
  });

  // TODO: StopYieldingInterest

  describe("#name", async () => {
    it("is 'TalentProtocolVaultToken' reflects the underlying token name, i.e. of 'TalentProtocolToken'", async () => {
      const name = await talentVault.name();

      expect(name).to.equal("TalentProtocolVaultToken");
    });
  });

  describe("#symbol", async () => {
    it("is 'TALENTVAULT' reflects the underlying token symbol, i.e. of 'TALENT'", async () => {
      const symbol = await talentVault.symbol();

      expect(symbol).to.equal("TALENTVAULT");
    });
  });

  describe("#asset", async () => {
    it("returns the address of the $TALENT contract", async () => {
      const returnedAddress = await talentVault.asset();

      expect(returnedAddress).not.to.equal(ethers.constants.AddressZero);
      expect(returnedAddress).to.equal(talentToken.address);
    });
  });

  describe("#totalAssets", async () => {
    it("returns the number of $TALENT that TalentVault Contract has as balance", async () => {
      await talentToken.approve(talentVault.address, 10n);
      await talentVault.deposit(10n, user1.address);

      const returnedValue = await talentVault.totalAssets();
      const balanceOfTalentVaultInTalent = await talentToken.balanceOf(talentVault.address);

      expect(returnedValue).to.equal(balanceOfTalentVaultInTalent);
    });
  });

  describe("Transferability", async () => {
    describe("#transfer", async () => {
      it("reverts because TalentVault is not transferable", async () => {
        await expect(talentVault.transfer(user1.address, 10n)).to.be.revertedWith("TalentVaultNonTransferable");
      });
    });

    describe("#transferFrom", async () => {
      it("reverts because TalentVault is not transferable", async () => {
        await talentVault.approve(admin.address, 10n);
        // fire
        await expect(talentVault.transferFrom(admin.address, user2.address, 10n)).to.be.revertedWith(
          "TalentVaultNonTransferable"
        );
      });
    });
  });

  describe("#setMaxDeposit", async () => {
    context("when called by the owner", async () => {
      it("sets the maximum deposit for the receiver", async () => {
        await talentVault.setMaxDeposit(user1.address, 10n);

        const deposit = await talentVault.maxDeposit(user1.address);

        expect(deposit).to.equal(10n);
      });
    });

    context("when called by a non-owner", async () => {
      it("reverts", async () => {
        await expect(talentVault.connect(user1).setMaxDeposit(user2.address, 10n)).to.revertedWith(
          "OwnableUnauthorizedAccount"
        );
      });
    });
  });

  describe("#removeMaxDepositLimit", async () => {
    context("when called by the owner", async () => {
      it("removes the maximum deposit for the receiver", async () => {
        await talentVault.removeMaxDepositLimit(user1.address);

        const deposit = await talentVault.maxDeposit(user1.address);

        expect(deposit).to.equal(ethers.constants.MaxUint256);
      });
    });

    context("when called by a non-owner", async () => {
      it("reverts", async () => {
        await expect(talentVault.connect(user1).removeMaxDepositLimit(user2.address)).to.revertedWith(
          "OwnableUnauthorizedAccount"
        );
      });
    });
  });

  describe("#maxDeposit", async () => {
    context("when recipient does not have a deposit limit", async () => {
      it("returns the maximum uint256", async () => {
        const maxDeposit = await talentVault.maxDeposit(user1.address);

        expect(maxDeposit).to.equal(ethers.constants.MaxUint256);
      });
    });

    context("when recipient has a deposit limit", async () => {
      it("returns it", async () => {
        await talentVault.setMaxDeposit(user1.address, 5n);

        const maxDeposit = await talentVault.maxDeposit(user1.address);

        expect(maxDeposit).to.equal(5n);
      });
    });
  });

  describe("#convertToShares", async () => {
    it("Should convert $TALENT to $TALENTVAULT with 1-to-1 ratio", async () => {
      const amountOfTalent = 10_000n;
      const amountOfTalentVault = await talentVault.convertToShares(amountOfTalent);
      expect(amountOfTalentVault).to.equal(amountOfTalent);
    });
  });

  describe("#convertToAssets", async () => {
    it("Should convert $TALENTVAULT to $TALENT with 1-to-1 ratio", async () => {
      const amountOfTalentVault = 10_000n;
      const amountOfTalent = await talentVault.convertToAssets(amountOfTalentVault);
      expect(amountOfTalent).to.equal(amountOfTalentVault);
    });
  });

  describe("#previewDeposit", async () => {
    it("Should return $TALENTVAULT equal to the number of $TALENT given", async () => {
      const amountOfTalent = 10_000n;
      const amountOfTalentVault = await talentVault.previewDeposit(amountOfTalent);
      expect(amountOfTalentVault).to.equal(amountOfTalent);
    });
  });

  describe("#deposit", async () => {
    it("Should mint $TALENTVAULT to the given receiver, equally increase the TalentVault $TALENT balance and equally decreases the $TALENT balance of receiver", async () => {
      const depositAmountInTalent = 10_000n;
      const equivalentDepositAmountInTalentVault = depositAmountInTalent;

      await talentToken.connect(user1).approve(talentVault.address, depositAmountInTalent);
      await talentToken.transfer(user1.address, depositAmountInTalent); // so that it has enough balance
      const user1BalanceBefore = await talentToken.balanceOf(user1.address);
      const user1BalanceInTalentVaultBefore = await talentVault.balanceOf(user1.address);
      const vaultBalanceBefore = await talentToken.balanceOf(talentVault.address);
      const userBalanceMetaBefore = await talentVault.userBalanceMeta(user1.address);
      const depositedAmountBefore = userBalanceMetaBefore.depositedAmount;

      // fire (admin deposits to itself)
      await expect(talentVault.connect(user1).deposit(depositAmountInTalent, user1.address))
        .to.emit(talentVault, "Deposit")
        .withArgs(user1.address, user1.address, depositAmountInTalent, equivalentDepositAmountInTalentVault);

      // vault balance in TALENT is increased
      const vaultBalanceAfter = await talentToken.balanceOf(talentVault.address);
      const expectedVaultBalanceAfter = vaultBalanceBefore.toBigInt() + depositAmountInTalent;
      expect(vaultBalanceAfter).to.equal(expectedVaultBalanceAfter);

      // user1 balance in TALENT decreases
      const user1BalanceAfter = await talentToken.balanceOf(user1.address);
      expect(user1BalanceAfter).to.equal(user1BalanceBefore.toBigInt() - depositAmountInTalent);

      // user1 balance in TalentVault increases (mint result)
      const user1BalanceInTalentVaultAfter = await talentVault.balanceOf(user1.address);
      expect(user1BalanceInTalentVaultAfter).to.equal(
        user1BalanceInTalentVaultBefore.toBigInt() + equivalentDepositAmountInTalentVault
      );

      // user1 depositedAmount is increased
      const userBalanceMeta = await talentVault.userBalanceMeta(user1.address);
      const depositedAmountAfter = userBalanceMeta.depositedAmount;
      expect(depositedAmountAfter).to.equal(depositedAmountBefore.toBigInt() + equivalentDepositAmountInTalentVault);
    });

    it("Should revert if $TALENT deposited is 0", async () => {
      await expect(talentVault.connect(user1).deposit(0n, user1.address)).to.be.revertedWith("InvalidDepositAmount");
    });
  });

  describe("#setMaxMint", async () => {
    context("when called by the owner", async () => {
      it("sets the maximum mint for the receiver", async () => {
        await talentVault.setMaxMint(user1.address, 10n);

        const mint = await talentVault.maxMint(user1.address);

        expect(mint).to.equal(10n);
      });
    });

    context("when called by a non-owner", async () => {
      it("reverts", async () => {
        await expect(talentVault.connect(user1).setMaxMint(user2.address, 10n)).to.revertedWith(
          "OwnableUnauthorizedAccount"
        );
      });
    });
  });

  describe("#removeMaxMintLimit", async () => {
    context("when called by the owner", async () => {
      it("removes the maximum mint for the receiver", async () => {
        await talentVault.removeMaxMintLimit(user1.address);

        const mint = await talentVault.maxMint(user1.address);

        expect(mint).to.equal(ethers.constants.MaxUint256);
      });
    });

    context("when called by a non-owner", async () => {
      it("reverts", async () => {
        await expect(talentVault.connect(user1).removeMaxMintLimit(user2.address)).to.revertedWith(
          "OwnableUnauthorizedAccount"
        );
      });
    });
  });

  describe("#maxMint", async () => {
    context("when recipient does not have a mint limit", async () => {
      it("returns the maximum uint256", async () => {
        const maxMint = await talentVault.maxMint(user1.address);

        expect(maxMint).to.equal(ethers.constants.MaxUint256);
      });
    });

    context("when recipient has a mint limit", async () => {
      it("returns it", async () => {
        await talentVault.setMaxMint(user1.address, 5n);

        const maxMint = await talentVault.maxMint(user1.address);

        expect(maxMint).to.equal(5n);
      });
    });
  });

  describe("#previewMint", async () => {
    it("Should return $TALENT equal to the number of $TALENTVAULT given", async () => {
      const amountOfTalentVault = 10_000n;
      const amountOfTalent = await talentVault.previewMint(amountOfTalentVault);
      expect(amountOfTalent).to.equal(amountOfTalentVault);
    });
  });

  describe("#mint", async () => {
    it("Should mint $TALENTVAULT to the given receiver, equally increase the TalentVault $TALENT balance and equally decrease the $TALENT balance of receiver", async () => {
      const depositAmountInTalentVault = 10_000n;
      const equivalentDepositAmountInTalent = depositAmountInTalentVault;

      await talentToken.connect(user1).approve(talentVault.address, depositAmountInTalentVault);
      await talentToken.transfer(user1.address, depositAmountInTalentVault); // so that it has enough balance
      const user1BalanceBefore = await talentToken.balanceOf(user1.address);
      const user1BalanceInTalentVaultBefore = await talentVault.balanceOf(user1.address);
      const vaultBalanceBefore = await talentToken.balanceOf(talentVault.address);
      const userBalanceMetaBefore = await talentVault.userBalanceMeta(user1.address);
      const depositedAmountBefore = userBalanceMetaBefore.depositedAmount;

      // fire (admin deposits to itself)
      await expect(talentVault.connect(user1).mint(depositAmountInTalentVault, user1.address))
        .to.emit(talentVault, "Deposit")
        .withArgs(user1.address, user1.address, equivalentDepositAmountInTalent, depositAmountInTalentVault);

      // vault balance in TALENT is increased
      const vaultBalanceAfter = await talentToken.balanceOf(talentVault.address);
      const expectedVaultBalanceAfter = vaultBalanceBefore.toBigInt() + depositAmountInTalentVault;
      expect(vaultBalanceAfter).to.equal(expectedVaultBalanceAfter);

      // user1 balance in TALENT decreases
      const user1BalanceAfter = await talentToken.balanceOf(user1.address);
      expect(user1BalanceAfter).to.equal(user1BalanceBefore.toBigInt() - depositAmountInTalentVault);

      // user1 balance in TalentVault increases (mint result)
      const user1BalanceInTalentVaultAfter = await talentVault.balanceOf(user1.address);
      expect(user1BalanceInTalentVaultAfter).to.equal(
        user1BalanceInTalentVaultBefore.toBigInt() + equivalentDepositAmountInTalent
      );

      // user1 depositedAmount is increased
      const userBalanceMeta = await talentVault.userBalanceMeta(user1.address);
      const depositedAmountAfter = userBalanceMeta.depositedAmount;
      expect(depositedAmountAfter).to.equal(depositedAmountBefore.toBigInt() + equivalentDepositAmountInTalent);
    });

    it("Should revert if $TALENT deposited is 0", async () => {
      await expect(talentVault.connect(user1).deposit(0n, user1.address)).to.be.revertedWith("InvalidDepositAmount");
    });
  });

  describe("#maxWithdraw", async () => {
    it("returns the balance of $TALENTVAULT of the given owner", async () => {
      // just setting up some non-zero values to make test more solid
      const depositAmount = 10_000n;
      await talentToken.transfer(user1.address, depositAmount);
      await talentToken.connect(user1).approve(talentVault.address, depositAmount);
      await talentVault.connect(user1).deposit(depositAmount, user1.address);
      const balance = await talentVault.balanceOf(user1.address);

      // fire
      const maxWithdraw = await talentVault.maxWithdraw(user1.address);

      expect(maxWithdraw).to.equal(balance);
    });
  });

  describe("#previewWithdraw", async () => {
    it("Should return $TALENTVAULT equal to the number of $TALENT given", async () => {
      const amountOfTalent = 10_000n;
      const amountOfTalentVault = await talentVault.previewWithdraw(amountOfTalent);
      expect(amountOfTalentVault).to.equal(amountOfTalent);
    });
  });

  describe("#withDraw", async () => {
    it("burns $TALENTVAULT from owner, increases $TALENT balance of receiver, decreases $TALENT balance of TalentVault", async () => {
      const depositTalent = 10_000n;

      await talentToken.transfer(user1.address, depositTalent);
      await talentToken.connect(user1).approve(talentVault.address, depositTalent);
      let trx = await talentVault.connect(user1).deposit(depositTalent, user1.address);
      await trx.wait();

      const user1TalentVaultBalanceBefore = await talentVault.balanceOf(user1.address);
      const user1TalentBalanceBefore = await talentToken.balanceOf(user1.address);
      const talentVaultTalentBalanceBefore = await talentToken.balanceOf(talentVault.address);

      // fire
      trx = await talentVault.connect(user1).withdraw(depositTalent, user1.address, user1.address);
      const receipt = await trx.wait();

      const withdrawEvent = receipt.events.find((event) => event.event === "Withdraw");

      const talentVaultWithDrawn = withdrawEvent.args[4];

      expect(talentVaultWithDrawn).to.equal(depositTalent);

      // user1 $TALENTVAULT balance decreases
      const user1TalentVaultBalanceAfter = await talentVault.balanceOf(user1.address);
      expect(user1TalentVaultBalanceAfter).to.equal(user1TalentVaultBalanceBefore.toBigInt() - depositTalent);

      // user1 $TALENT balance increases
      const user1TalentBalanceAfter = await talentToken.balanceOf(user1.address);
      expect(user1TalentBalanceAfter).to.equal(user1TalentBalanceBefore.toBigInt() + depositTalent);

      // TalentVault $TALENT balance decreases
      const talentVaultTalentBalanceAfter = await talentToken.balanceOf(talentVault.address);
      expect(talentVaultTalentBalanceAfter).to.equal(talentVaultTalentBalanceBefore.toBigInt() - depositTalent);
    });
  });

  describe("#maxRedeem", async () => {
    it("returns the balance of $TALENTVAULT of the given owner", async () => {
      // just setting up some non-zero values to make test more solid
      const depositAmount = 10_000n;
      await talentToken.transfer(user1.address, depositAmount);
      await talentToken.connect(user1).approve(talentVault.address, depositAmount);
      await talentVault.connect(user1).deposit(depositAmount, user1.address);
      const balance = await talentVault.balanceOf(user1.address);

      // fire
      const maxRedeem = await talentVault.maxRedeem(user1.address);

      expect(maxRedeem).to.equal(balance);
    });
  });

  describe("#previewRedeem", async () => {
    it("Should return $TALENT equal to the number of $TALENTVAULT given", async () => {
      const amountOfTalentVault = 10_000n;
      const amountOfTalent = await talentVault.previewRedeem(amountOfTalentVault);
      expect(amountOfTalent).to.equal(amountOfTalentVault);
    });
  });

  describe("#redeem", async () => {
    it("burns $TALENTVAULT from owner, increases $TALENT balance of receiver, decreases $TALENT balance of TalentVault", async () => {
      const depositTalent = 10_000n;
      const equivalentDepositTalentVault = depositTalent;

      await talentToken.transfer(user1.address, depositTalent);
      await talentToken.connect(user1).approve(talentVault.address, depositTalent);
      let trx = await talentVault.connect(user1).deposit(depositTalent, user1.address);
      await trx.wait();

      const user1TalentVaultBalanceBefore = await talentVault.balanceOf(user1.address);
      const user1TalentBalanceBefore = await talentToken.balanceOf(user1.address);
      const talentVaultTalentBalanceBefore = await talentToken.balanceOf(talentVault.address);

      // fire
      trx = await talentVault.connect(user1).redeem(equivalentDepositTalentVault, user1.address, user1.address);
      const receipt = await trx.wait();

      const withdrawEvent = receipt.events.find((event) => event.event === "Withdraw");

      const talentWithDrawn = withdrawEvent.args[4];

      expect(talentWithDrawn).to.equal(equivalentDepositTalentVault);

      // user1 $TALENTVAULT balance decreases
      const user1TalentVaultBalanceAfter = await talentVault.balanceOf(user1.address);
      expect(user1TalentVaultBalanceAfter).to.equal(user1TalentVaultBalanceBefore.toBigInt() - depositTalent);

      // user1 $TALENT balance increases
      const user1TalentBalanceAfter = await talentToken.balanceOf(user1.address);
      expect(user1TalentBalanceAfter).to.equal(user1TalentBalanceBefore.toBigInt() + depositTalent);

      // TalentVault $TALENT balance decreases
      const talentVaultTalentBalanceAfter = await talentToken.balanceOf(talentVault.address);
      expect(talentVaultTalentBalanceAfter).to.equal(talentVaultTalentBalanceBefore.toBigInt() - depositTalent);
    });
  });

  describe("#depositForAddress", async () => {
    it("Should deposit the amount to the address given", async () => {
      const depositAmount = 100_000n;
      await talentToken.transfer(user1.address, depositAmount); // so that sender has enough balance
      const user1BalanceBefore = await talentToken.balanceOf(user1.address);

      await talentToken.connect(user1).approve(talentVault.address, depositAmount); // so that sender has approved vault

      const vaultBalanceBefore = await talentToken.balanceOf(talentVault.address);

      const user2BalanceMetaBefore = await talentVault.userBalanceMeta(user2.address);

      const user2TalentVaultBalanceBefore = await talentVault.balanceOf(user2.address);

      // fire
      await expect(talentVault.connect(user1).depositForAddress(user2.address, depositAmount))
        .to.emit(talentVault, "Deposit")
        .withArgs(user1.address, user2.address, depositAmount, depositAmount);

      // user1 $TALENT balance is decreased
      const user1BalanceAfter = await talentToken.balanceOf(user1.address);
      const expectedUser1BalanceAfter = user1BalanceBefore.sub(depositAmount);
      expect(user1BalanceAfter).to.equal(expectedUser1BalanceAfter);

      // vault $TALENT balance is increased
      const vaultBalanceAfter = await talentToken.balanceOf(talentVault.address);
      const expectedVaultBalanceAfter = vaultBalanceBefore.toBigInt() + depositAmount;
      expect(vaultBalanceAfter).to.equal(expectedVaultBalanceAfter);

      // deposit for user2 is updated on storage
      const user2BalanceMetaAfter = await talentVault.userBalanceMeta(user2.address);
      expect(user2BalanceMetaAfter.depositedAmount).to.equal(
        user2BalanceMetaBefore.depositedAmount.toBigInt() + depositAmount
      );

      // user2 $TALENTVAULT balance is increased
      const user2TalentVaultBalanceAfter = await talentVault.balanceOf(user2.address);
      expect(user2TalentVaultBalanceAfter).to.equal(user2TalentVaultBalanceBefore.toBigInt() + depositAmount);
    });

    it("Should not allow deposits of zero tokens", async () => {
      await expect(talentVault.connect(user1).depositForAddress(ethers.constants.AddressZero, 0n)).to.be.revertedWith(
        "InvalidDepositAmount()"
      );
    });

    it("Should not allow deposit of amount that the sender does not have", async () => {
      const balanceOfUser1 = 100_000n;

      await talentToken.transfer(user1.address, balanceOfUser1);

      const depositAmount = 100_001n;

      await talentToken.connect(user1).approve(talentVault.address, depositAmount);

      await expect(talentVault.connect(user1).depositForAddress(user2.address, depositAmount)).to.be.revertedWith(
        "ERC20InsufficientBalance"
      );
    });

    it("Should not allow deposit of amount bigger than the allowed by the sender to be spent by the talent contract", async () => {
      const depositAmount = 100_000n;

      await talentToken.transfer(user1.address, depositAmount); // so that user1 has enough balance

      const approvedAmount = depositAmount - 1n;

      await talentToken.connect(user1).approve(talentVault.address, approvedAmount);

      // fire

      await expect(talentVault.connect(user1).depositForAddress(user2.address, depositAmount)).to.be.revertedWith(
        "ERC20InsufficientAllowance"
      );
    });

    it("Should allow deposit of amount equal to the allowed by the sender to be spent by the talent contract", async () => {
      const depositAmount = ethers.utils.parseEther("1000");

      await talentToken.connect(user1).approve(talentVault.address, depositAmount);

      await expect(talentVault.connect(user1).depositForAddress(user2.address, depositAmount)).to.be.revertedWith(
        "ERC20InsufficientBalance"
      );
    });
  });

  describe("#refreshForAddress", async () => {
    context("when address does not have a deposit", async () => {
      it("reverts", async () => {
        await expect(talentVault.refreshForAddress(user1.address)).to.be.revertedWith("NoDepositFound");
      });
    });
  });

  // describe("Withdrawals", () => {
  //   beforeEach(async () => {
  //     const depositAmount = ethers.utils.parseEther("1000");
  //     await talentToken.transfer(user1.address, depositAmount);
  //     await talentToken.connect(user1).approve(talentVault.address, depositAmount);
  //     await talentVault.connect(user1).deposit(depositAmount);
  //   });

  //   it("Should allow users to withdraw tokens", async () => {
  //     const withdrawAmount = ethers.utils.parseEther("500");
  //     await expect(talentVault.connect(user1).withdraw(withdrawAmount))
  //       .to.emit(talentVault, "Withdrawn")
  //       .withArgs(user1.address, withdrawAmount);

  //     const userBalance = await talentVault.balanceOf(user1.address);
  //     expect(userBalance).to.be.closeTo(ethers.utils.parseEther("500"), ethers.utils.parseEther("0.1"));
  //   });

  //   it("Should not allow withdrawals of more than the balance", async () => {
  //     const withdrawAmount = ethers.utils.parseEther("1500");
  //     await expect(talentVault.connect(user1).withdraw(withdrawAmount)).to.be.revertedWith("Not enough balance");
  //   });
  // });

  // describe("Interest Calculation", () => {
  //   it("Should calculate interest correctly", async () => {
  //     const depositAmount = ethers.utils.parseEther("1000");
  //     await talentToken.transfer(user1.address, depositAmount);
  //     await talentToken.connect(user1).approve(talentVault.address, depositAmount);
  //     await talentVault.connect(user1).deposit(depositAmount);

  //     // Simulate time passing
  //     await ethers.provider.send("evm_increaseTime", [31536000]); // 1 year
  //     await ethers.provider.send("evm_mine", []);

  //     const expectedInterest = depositAmount.mul(10).div(100); // 10% interest
  //     const userBalance = await talentVault.balanceOf(user1.address);
  //     expect(userBalance).to.equal(depositAmount.add(expectedInterest));
  //   });

  //   // 10000
  //   it("Should calculate interest even if amount is above the max yield amount correctly", async () => {
  //     const depositAmount = ethers.utils.parseEther("15000");
  //     const maxAmount = ethers.utils.parseEther("10000");
  //     await talentToken.transfer(user1.address, depositAmount);
  //     await talentToken.connect(user1).approve(talentVault.address, depositAmount);
  //     await talentVault.connect(user1).deposit(depositAmount);

  //     // Simulate time passing
  //     await ethers.provider.send("evm_increaseTime", [31536000]); // 1 year
  //     await ethers.provider.send("evm_mine", []);

  //     const expectedInterest = maxAmount.mul(10).div(100); // 10% interest
  //     const userBalance = await talentVault.balanceOf(user1.address);
  //     expect(userBalance).to.equal(depositAmount.add(expectedInterest));
  //   });

  //   it("Should calculate interest correctly for builders with scores below 50", async () => {
  //     await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
  //     await passportRegistry.connect(user1).create("source1");

  //     const passportId = await passportRegistry.passportId(user1.address);
  //     await passportBuilderScore.setScore(passportId, 40); // Set builder score below 50
  //     const depositAmount = ethers.utils.parseEther("1000");
  //     await talentToken.transfer(user1.address, depositAmount);
  //     await talentToken.connect(user1).approve(talentVault.address, depositAmount);
  //     await talentVault.connect(user1).deposit(depositAmount);

  //     // Simulate time passing
  //     await ethers.provider.send("evm_increaseTime", [31536000]); // 1 year
  //     await ethers.provider.send("evm_mine", []);

  //     await passportBuilderScore.setScore(passportId, 40); // Set builder score below 50

  //     const expectedInterest = depositAmount.mul(15).div(100); // 15% interest
  //     const userBalance = await talentVault.balanceOf(user1.address);
  //     expect(userBalance).to.be.closeTo(depositAmount.add(expectedInterest), ethers.utils.parseEther("0.1"));
  //   });

  //   it("Should calculate interest correctly for builders with scores above 50", async () => {
  //     await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
  //     await passportRegistry.connect(user1).create("source1");

  //     const passportId = await passportRegistry.passportId(user1.address);
  //     await passportBuilderScore.setScore(passportId, 65); // Set builder score above 50
  //     const depositAmount = ethers.utils.parseEther("1000");
  //     await talentToken.transfer(user1.address, depositAmount);
  //     await talentToken.connect(user1).approve(talentVault.address, depositAmount);
  //     await talentVault.connect(user1).deposit(depositAmount);

  //     // Simulate time passing
  //     await ethers.provider.send("evm_increaseTime", [31536000]); // 1 year
  //     await ethers.provider.send("evm_mine", []);

  //     await passportBuilderScore.setScore(passportId, 65); // Set builder score above 50

  //     const expectedInterest = depositAmount.mul(20).div(100); // 20% interest
  //     const userBalance = await talentVault.balanceOf(user1.address);
  //     expect(userBalance).to.be.closeTo(depositAmount.add(expectedInterest), ethers.utils.parseEther("0.1"));
  //   });

  //   it("Should calculate interest correctly for builders with scores above 75", async () => {
  //     await passportRegistry.setGenerationMode(true, 1); // Enable sequential mode
  //     await passportRegistry.connect(user1).create("source1");

  //     const passportId = await passportRegistry.passportId(user1.address);
  //     await passportBuilderScore.setScore(passportId, 90); // Set builder score above 75
  //     const depositAmount = ethers.utils.parseEther("1000");
  //     await talentToken.transfer(user1.address, depositAmount);
  //     await talentToken.connect(user1).approve(talentVault.address, depositAmount);
  //     await talentVault.connect(user1).deposit(depositAmount);

  //     // Simulate time passing
  //     await ethers.provider.send("evm_increaseTime", [31536000]); // 1 year
  //     await ethers.provider.send("evm_mine", []);

  //     await passportBuilderScore.setScore(passportId, 90); // Set builder score above 75

  //     const expectedInterest = depositAmount.mul(25).div(100); // 25% interest
  //     const userBalance = await talentVault.balanceOf(user1.address);
  //     expect(userBalance).to.be.closeTo(depositAmount.add(expectedInterest), ethers.utils.parseEther("0.1"));
  //   });
  // });

  // describe("Administrative Functions", () => {
  //   it("Should allow the owner to update the yield rate", async () => {
  //     const newYieldRate = 15_00; // 15%
  //     await talentVault.connect(admin).setYieldRate(newYieldRate);
  //     expect(await talentVault.yieldRateBase()).to.equal(newYieldRate);
  //   });

  //   it("Should not allow non-owners to update the yield rate", async () => {
  //     const newYieldRate = 15_00; // 15%
  //     await expect(talentVault.connect(user1).setYieldRate(newYieldRate)).to.be.revertedWith(
  //       `OwnableUnauthorizedAccount("${user1.address}")`
  //     );
  //   });
  // });
});
