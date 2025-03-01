import { useState } from "react";
import { ethers } from "ethers";
import "./App.css";

// Define types for the proof data
interface ProofData {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  publicSignals: string[];
}

const contractAddress: string = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const contractABI: any[] = [
  // Paste the ABI of your Verifier.sol contract here
  {
    "inputs": [
      {
        "internalType": "uint256[2]",
        "name": "_pA",
        "type": "uint256[2]"
      },
      {
        "internalType": "uint256[2][2]",
        "name": "_pB",
        "type": "uint256[2][2]"
      },
      {
        "internalType": "uint256[2]",
        "name": "_pC",
        "type": "uint256[2]"
      },
      {
        "internalType": "uint256[1]",
        "name": "_pubSignals",
        "type": "uint256[1]"
      }
    ],
    "name": "verifyProof",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

function App() {
  const [proof, setProof] = useState<ProofData | null>(null);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Handle proof.json upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          setProof(JSON.parse(result));
        }
      };
      reader.readAsText(file);
    }
  };

  // Connect MetaMask
  const connectWallet = async () => {
    if (!(window as any).ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    try {
      const accounts = await (window as any).ethereum.request({ method: "eth_accounts" });

      if (accounts.length > 0) {
        console.log("Already connected:", accounts[0]);
        return;
      }
      // Avoid error if request is already pending
      const isRequestPending = (window as any).ethereum.isConnected() && 
        (await (window as any).ethereum.request({ 
          method: "wallet_requestPermissions", 
          params: [{ eth_accounts: {} }] 
        }));

      if (isRequestPending) {
        console.log("Wallet connection request pending, not sending new request");
        return;
      }
      console.log("Attempting new connection");
      await (window as any).ethereum.request({ method: "eth_requestAccounts" });
    } catch (error: any) {
      if (error.code === -32002) {
        alert("Wallet connection request pending. Please check MetaMask.");
      } else {
        console.error("Wallet connection error:", error);
      }
    }
  };

  // Send proof to smart contract
  const verifyProof = async () => {
    if (!proof) {
      alert("Please upload proof.json");
      return;
    }
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const { pi_a, pi_b, pi_c, publicSignals } = proof;
      
      // Check if proof is valid
      if (!pi_a || !pi_b || !pi_c || !publicSignals) {
        console.error("Invalid proof format:", proof);
        alert("Invalid proof format. Please upload a valid proof.json file.");
        return;
      }

      console.log("Raw proof data:", {
        pi_a,
        pi_b,
        pi_c,
        publicSignals
      });

      // Helper function to safely convert string to BigInt
      const toBigNumber = (str: string) => {
        try {
          // For snarkJS output, we need to handle decimal strings
          if (!str.startsWith('0x') && !isNaN(Number(str))) {
            // It's a decimal string, convert directly
            return BigInt(str);
          }
          
          // For hex strings
          const cleanStr = str.startsWith('0x') ? str.slice(2) : str;
          return ethers.toBigInt(`0x${cleanStr}`);
        } catch (error) {
          console.error(`Error converting ${str} to BigInt:`, error);
          throw new Error(`Failed to convert ${str} to BigInt`);
        }
      };

      // Check if a value is within uint256 range
      const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      const isValidUint256 = (value: bigint) => value >= 0 && value <= MAX_UINT256;

      // Validate and format each component
      try {
        // Format proof for the contract
        // The contract expects uint256[2], uint256[2][2], uint256[2], uint256[1]
        const pA = [toBigNumber(pi_a[0]), toBigNumber(pi_a[1])];
        if (!pA.every(isValidUint256)) {
          throw new Error(`pA contains values outside uint256 range: ${pA.map(n => n.toString())}`);
        }
        console.log("pA formatted:", pA.map(n => n.toString()));
        
        // For pB, we need to swap the order of elements in each pair
        const pB = [
          [toBigNumber(pi_b[0][1]), toBigNumber(pi_b[0][0])],
          [toBigNumber(pi_b[1][1]), toBigNumber(pi_b[1][0])]
        ];
        if (!pB.every(row => row.every(isValidUint256))) {
          throw new Error(`pB contains values outside uint256 range: ${pB.map(row => row.map(n => n.toString()))}`);
        }
        console.log("pB formatted:", pB.map(row => row.map(n => n.toString())));
        
        const pC = [toBigNumber(pi_c[0]), toBigNumber(pi_c[1])];
        if (!pC.every(isValidUint256)) {
          throw new Error(`pC contains values outside uint256 range: ${pC.map(n => n.toString())}`);
        }
        console.log("pC formatted:", pC.map(n => n.toString()));
        
        const pubSignals = [toBigNumber(publicSignals[0])];
        if (!pubSignals.every(isValidUint256)) {
          throw new Error(`pubSignals contains values outside uint256 range: ${pubSignals.map(n => n.toString())}`);
        }
        console.log("pubSignals formatted:", pubSignals.map(n => n.toString()));

        // Call the contract's verifyProof function
        console.log("Calling contract with formatted parameters");
        
        try {
          // First try using a low-level call to handle the custom assembly return format
          // Encode the function call manually
          const verifyProofInterface = new ethers.Interface([
            "function verifyProof(uint256[2] calldata _pA, uint256[2][2] calldata _pB, uint256[2] calldata _pC, uint256[1] calldata _pubSignals) view returns (bool)"
          ]);
          
          const callData = verifyProofInterface.encodeFunctionData("verifyProof", [
            pA, pB, pC, pubSignals
          ]);
          
          console.log("Encoded call data:", callData);
          
          // Make a raw call to the contract
          const rawCallResult = await provider.call({
            to: contractAddress,
            data: callData
          });
          
          console.log("Raw call result:", rawCallResult);
          
          // Decode the result - for assembly returns, this is typically just a boolean (0x0 or 0x1)
          // The contract returns a single boolean value
          let result = false;
          if (rawCallResult === "0x0000000000000000000000000000000000000000000000000000000000000001") {
            result = true;
          } else if (rawCallResult === "0x0000000000000000000000000000000000000000000000000000000000000000") {
            result = false;
          } else {
            // If we can't determine the result from the raw call, try the standard method
            console.log("Raw call returned unexpected format, trying standard call");
            result = await contract.verifyProof(pA, pB, pC, pubSignals);
          }
          
          console.log("Verification result:", result);
          setVerificationResult(result ? "Valid Proof ✅" : "Invalid Proof ❌");
        } catch (callError: any) {
          console.error("Contract call error:", callError);
          
          // Check if this is an out-of-bounds error
          if (callError.message.includes("out-of-bounds")) {
            setVerificationResult("Error: One of the proof values is out of bounds for uint256");
          } 
          // Check if this is a decoding error
          else if (callError.message.includes("could not decode result data")) {
            // Try one more approach - the contract might be reverting
            try {
              // Try to simulate the transaction to get revert reason
              const tx = await contract.verifyProof.populateTransaction(pA, pB, pC, pubSignals);
              const result = await provider.call(tx);
              console.log("Simulation result:", result);
              setVerificationResult(result ? "Valid Proof1 ✅" : "Invalid Proof ❌");
            } catch (simError: any) {
              console.error("Simulation error:", simError);
              setVerificationResult("Error: Contract verification failed (possible invalid proof)");
            }
          } else {
            setVerificationResult(`Error: ${callError.message}`);
          }
        }
      } catch (error: any) {
        console.error("Proof formatting error:", error);
        setVerificationResult(`Error: ${error.message}`);
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      setVerificationResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>ZKP Age Verification Dapp</h2>
      <button onClick={connectWallet}>Connect Wallet</button>
      <input type="file" accept="application/json" onChange={handleFileUpload} />
      <button onClick={verifyProof} disabled={!proof || loading}>
         {loading ? "Waiting for MetaMask approval..." : "Verify Proof"}
      </button>
      <h3>{verificationResult}</h3>
    </div>
  );
}

export default App