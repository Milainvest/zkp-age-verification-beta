const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");

describe("Verifier Contract", function () {
    let verifier;
    let proof;
    let publicSignals;

    before(async function () {
        // Deploy the verifier contract
        const Verifier = await ethers.getContractFactory("Groth16Verifier");
        verifier = await Verifier.deploy();
        await verifier.waitForDeployment();

        console.log("Verifier deployed at:", verifier.target);

        // Read proof and public signals
        proof = JSON.parse(fs.readFileSync("build/proof1.json", "utf-8"));

        // Log the values for debugging
        console.log("Proof:", proof);
        console.log("Public Signals:", proof.publicSignals);
    });

    it("should verify a valid proof", async function () {
        // Format proof points - IMPORTANT: We need to swap elements in pi_b
        const calldata = await verifier.verifyProof(
            [proof.pi_a[0], proof.pi_a[1]],
            [
                [proof.pi_b[0][1], proof.pi_b[0][0]], // Swap these elements
                [proof.pi_b[1][1], proof.pi_b[1][0]]  // Swap these elements
            ],
            [proof.pi_c[0], proof.pi_c[1]],
            proof.publicSignals
        );

        console.log("Formatted proof1:", {
            pi_a: [typeof proof.pi_a[0], typeof proof.pi_a[1]],
            pi_b: [
                [typeof proof.pi_b[0][1], typeof proof.pi_b[0][0]],
                [typeof proof.pi_b[1][1], typeof proof.pi_b[1][0]]
            ],
            pi_c: [typeof proof.pi_c[0], typeof proof.pi_c[1]],
            publicSignals: typeof proof.publicSignals[0]
        });

        expect(calldata).to.be.true;
    });
});
