import { useState } from "react";
import { ethers } from "ethers";
import "./App.css";

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
  const [proof, setProof] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
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
      const proofArray = [
        [pi_a[0], pi_a[1]], // A
        [
          [pi_b[0][0], pi_b[0][1]],
          [pi_b[1][0], pi_b[1][1]]
        ], // B
        [pi_c[0], pi_c[1]], // C
        publicSignals // Public input
      ];
     // Check if proof is valid
      if (!pi_a || !pi_b || !pi_c || !publicSignals) {
        console.error("Invalid proof format:", proof);
        console.error("Invalid proof array structure:", proof);
        console.log("pi_a:", pi_a);
        console.log("pi_b:", pi_b);
        console.log("pi_c:", pi_c);
        console.log("publicSignals:", publicSignals);
        alert("Invalid proof format. Please upload a valid proof.json file.");
        return;
      }
      // Format proof for contract verification
      const formattedProof = [
        [pi_a[0], pi_a[1]],
        [
          [pi_b[0][1], pi_b[0][0]],
          [pi_b[1][1], pi_b[1][0]]
        ],
        [pi_c[0], pi_c[1]],
        [BigInt(publicSignals[0])]
      ];
      console.log("proofArray:", proofArray);
      console.log("Sending proof:", formattedProof);
      const result = await contract.verifyProof(...formattedProof);
      setVerificationResult(result ? "Valid Proof ✅" : "Invalid Proof ❌" as any);
    } catch (error) {
      console.error(error);
      setVerificationResult("Error verifying proof ❌" as any);
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
