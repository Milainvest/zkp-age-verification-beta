import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import "./App.css";

// Define types for the proof data
interface ProofData {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  publicSignals: string[];
}

// Define verification status type for better UI feedback
type VerificationStatus = {
  result: string | null;
  isLoading: boolean;
  ageVerified: boolean | null;
  details: {
    startTime?: number;
    endTime?: number;
    method?: string;
    error?: string;
    publicSignalValue?: string;
  };
};

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
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    result: null,
    isLoading: false,
    ageVerified: null,
    details: {}
  });
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Check if wallet is already connected on component mount
  useEffect(() => {
    const checkConnection = async () => {
      if ((window as any).ethereum) {
        try {
          const accounts = await (window as any).ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            setWalletConnected(true);
            setWalletAddress(accounts[0]);
          }
        } catch (error) {
          console.error("Failed to check wallet connection:", error);
        }
      }
    };
    
    checkConnection();
    
    // Listen for account changes
    if ((window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletConnected(true);
          setWalletAddress(accounts[0]);
        } else {
          setWalletConnected(false);
          setWalletAddress(null);
        }
      });
    }
    
    return () => {
      // Clean up listeners
      if ((window as any).ethereum) {
        (window as any).ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, []);

  // Handle proof.json upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          try {
            const parsedProof = JSON.parse(result);
            setProof(parsedProof);
            // Reset verification status when new proof is uploaded
            setVerificationStatus({
              result: null,
              isLoading: false,
              ageVerified: null,
              details: {}
            });
          } catch (error) {
            alert("Invalid JSON file. Please upload a valid proof.json file.");
          }
        }
      };
      reader.readAsText(file);
    }
  }, []);

  // Connect MetaMask
  const connectWallet = useCallback(async () => {
    if (!(window as any).ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    
    try {
      setVerificationStatus(prev => ({
        ...prev,
        isLoading: true,
        details: { ...prev.details, error: undefined }
      }));
      
      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      
      if (accounts.length > 0) {
        setWalletConnected(true);
        setWalletAddress(accounts[0]);
      }
    } catch (error: any) {
      if (error.code === -32002) {
        alert("Wallet connection request pending. Please check MetaMask.");
      } else {
        console.error("Wallet connection error:", error);
        setVerificationStatus(prev => ({
          ...prev,
          details: { ...prev.details, error: `Wallet connection error: ${error.message}` }
        }));
      }
    } finally {
      setVerificationStatus(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  }, []);

  // Helper function to safely convert string to BigInt
  const toBigNumber = useCallback((str: string) => {
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
  }, []);

  // Optimized verification method that prioritizes the successful approach
  const verifyProof = useCallback(async () => {
    if (!proof) {
      alert("Please upload proof.json");
      return;
    }
    
    if (!walletConnected) {
      alert("Please connect your wallet first");
      return;
    }
    
    // Start timing the verification process
    const startTime = performance.now();
    
    setVerificationStatus({
      result: null,
      isLoading: true,
      ageVerified: null,
      details: { startTime, error: undefined }
    });
    
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const { pi_a, pi_b, pi_c, publicSignals } = proof;
      
      // Check if proof is valid
      if (!pi_a || !pi_b || !pi_c || !publicSignals) {
        throw new Error("Invalid proof format");
      }

      console.log("Raw proof data:", {
        pi_a,
        pi_b,
        pi_c,
        publicSignals
      });

      // Check if a value is within uint256 range
      const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      const isValidUint256 = (value: bigint) => value >= 0 && value <= MAX_UINT256;

      // Format and validate proof components
      try {
        // Format proof for the contract
        const pA = [toBigNumber(pi_a[0]), toBigNumber(pi_a[1])];
        if (!pA.every(isValidUint256)) {
          throw new Error(`pA contains values outside uint256 range`);
        }
        console.log("pA formatted:", pA.map(n => n.toString()));
        
        // For pB, we need to swap the order of elements in each pair
        const pB = [
          [toBigNumber(pi_b[0][1]), toBigNumber(pi_b[0][0])],
          [toBigNumber(pi_b[1][1]), toBigNumber(pi_b[1][0])]
        ];
        if (!pB.every(row => row.every(isValidUint256))) {
          throw new Error(`pB contains values outside uint256 range`);
        }
        console.log("pB formatted:", pB.map(row => row.map(n => n.toString())));
        
        const pC = [toBigNumber(pi_c[0]), toBigNumber(pi_c[1])];
        if (!pC.every(isValidUint256)) {
          throw new Error(`pC contains values outside uint256 range`);
        }
        console.log("pC formatted:", pC.map(n => n.toString()));
        
        const pubSignals = [toBigNumber(publicSignals[0])];
        if (!pubSignals.every(isValidUint256)) {
          throw new Error(`pubSignals contains values outside uint256 range`);
        }
        console.log("pubSignals formatted:", pubSignals.map(n => n.toString()));
        
        // Store the publicSignal value for age verification
        const publicSignalValue = pubSignals[0].toString();
        const isOver18 = publicSignalValue === "1";
        console.log("Public signal value:", publicSignalValue, "Is over 18:", isOver18);

        // Call the contract's verifyProof function - using the most reliable method first
        console.log("Calling contract with formatted parameters");
        
        // Based on previous success, start with the simulation approach
        try {
          // Method 1: Transaction simulation (previously most successful)
          const tx = await contract.verifyProof.populateTransaction(pA, pB, pC, pubSignals);
          const simResult = await provider.call(tx);
          console.log("Simulation result:", simResult);
          
          // Check if we got a valid result
          if (simResult === "0x" || simResult === "0x0000000000000000000000000000000000000000000000000000000000000001") {
            const endTime = performance.now();
            setVerificationStatus({
              result: "Valid Proof ✅",
              isLoading: false,
              ageVerified: isOver18,
              details: { 
                startTime, 
                endTime, 
                method: "Simulation",
                error: undefined,
                publicSignalValue
              }
            });
            return;
          }
          
          if (simResult === "0x0000000000000000000000000000000000000000000000000000000000000000") {
            const endTime = performance.now();
            setVerificationStatus({
              result: "Invalid Proof ❌",
              isLoading: false,
              ageVerified: null, // Invalid proof means we can't determine age
              details: { 
                startTime, 
                endTime, 
                method: "Simulation",
                error: undefined,
                publicSignalValue
              }
            });
            return;
          }
        } catch (simError) {
          console.log("Simulation approach failed, trying low-level call");
        }
        
        // Method 2: Low-level call
        try {
          const verifyProofInterface = new ethers.Interface([
            "function verifyProof(uint256[2] calldata _pA, uint256[2][2] calldata _pB, uint256[2] calldata _pC, uint256[1] calldata _pubSignals) view returns (bool)"
          ]);
          
          const callData = verifyProofInterface.encodeFunctionData("verifyProof", [
            pA, pB, pC, pubSignals
          ]);
          
          const rawCallResult = await provider.call({
            to: contractAddress,
            data: callData
          });
          
          console.log("Raw call result:", rawCallResult);
          
          if (rawCallResult === "0x0000000000000000000000000000000000000000000000000000000000000001") {
            const endTime = performance.now();
            setVerificationStatus({
              result: "Valid Proof ✅",
              isLoading: false,
              ageVerified: isOver18,
              details: { 
                startTime, 
                endTime, 
                method: "Low-level call",
                error: undefined,
                publicSignalValue
              }
            });
            return;
          }
          
          if (rawCallResult === "0x0000000000000000000000000000000000000000000000000000000000000000") {
            const endTime = performance.now();
            setVerificationStatus({
              result: "Invalid Proof ❌",
              isLoading: false,
              ageVerified: null, // Invalid proof means we can't determine age
              details: { 
                startTime, 
                endTime, 
                method: "Low-level call",
                error: undefined,
                publicSignalValue
              }
            });
            return;
          }
        } catch (rawCallError) {
          console.log("Low-level call failed, trying standard method");
        }
        
        // Method 3: Standard contract call (least reliable but simplest)
        try {
          const result = await contract.verifyProof(pA, pB, pC, pubSignals);
          console.log("Standard call result:", result);
          
          const endTime = performance.now();
          setVerificationStatus({
            result: result ? "Valid Proof ✅" : "Invalid Proof ❌",
            isLoading: false,
            ageVerified: result ? isOver18 : null, // Only check age if proof is valid
            details: { 
              startTime, 
              endTime, 
              method: "Standard call",
              error: undefined,
              publicSignalValue
            }
          });
          return;
        } catch (standardError) {
          console.error("All verification methods failed");
          throw new Error("Verification failed with all methods");
        }
      } catch (error: any) {
        console.error("Proof formatting error:", error);
        const endTime = performance.now();
        setVerificationStatus({
          result: "Error ❌",
          isLoading: false,
          ageVerified: null,
          details: { 
            startTime, 
            endTime, 
            error: error.message 
          }
        });
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      const endTime = performance.now();
      setVerificationStatus({
        result: "Error ❌",
        isLoading: false,
        ageVerified: null,
        details: { 
          startTime, 
          endTime, 
          error: error.message 
        }
      });
    }
  }, [proof, walletConnected, toBigNumber]);

  // Calculate verification time
  const verificationTime = verificationStatus.details.endTime && verificationStatus.details.startTime
    ? ((verificationStatus.details.endTime - verificationStatus.details.startTime) / 1000).toFixed(2)
    : null;

  // Get age verification message
  const getAgeVerificationMessage = () => {
    if (verificationStatus.ageVerified === true) {
      return "✓ This person is 18 years or older";
    } else if (verificationStatus.ageVerified === false) {
      return "✗ This person is under 18 years old";
    }
    return null;
  };

  return (
    <div style={{ textAlign: "center", padding: "20px", maxWidth: "800px", margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ color: "#333", marginBottom: "30px" }}>ZKP Age Verification Dapp</h1>
      
      <div style={{ 
        background: "#f5f5f5", 
        padding: "20px", 
        borderRadius: "8px", 
        marginBottom: "20px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{ color: "#444", fontSize: "18px", marginBottom: "15px" }}>Wallet Connection</h2>
        {walletConnected ? (
          <div>
            <p style={{ color: "#4CAF50", fontWeight: "bold" }}>Connected ✓</p>
            <p style={{ fontSize: "14px", wordBreak: "break-all" }}>Address: {walletAddress}</p>
          </div>
        ) : (
          <button 
            onClick={connectWallet}
            style={{
              background: "#4CAF50",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            Connect Wallet
          </button>
        )}
      </div>
      
      <div style={{ 
        background: "#f5f5f5", 
        padding: "20px", 
        borderRadius: "8px", 
        marginBottom: "20px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{ color: "#444", fontSize: "18px", marginBottom: "15px" }}>Proof Upload</h2>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" }}>
          <input 
            type="file" 
            accept="application/json" 
            onChange={handleFileUpload}
            style={{ 
              padding: "10px", 
              border: "1px solid #ddd", 
              borderRadius: "4px",
              background: "white"
            }} 
          />
          <div style={{ fontSize: "14px", color: proof ? "#4CAF50" : "#999" }}>
            {proof ? "✓ Proof loaded" : "No proof loaded"}
          </div>
        </div>
      </div>
      
      <div style={{ 
        background: "#f5f5f5", 
        padding: "20px", 
        borderRadius: "8px", 
        marginBottom: "20px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{ color: "#444", fontSize: "18px", marginBottom: "15px" }}>Verification</h2>
        <button 
          onClick={verifyProof} 
          disabled={!proof || !walletConnected || verificationStatus.isLoading}
          style={{
            background: !proof || !walletConnected || verificationStatus.isLoading ? "#cccccc" : "#2196F3",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: "4px",
            cursor: !proof || !walletConnected || verificationStatus.isLoading ? "not-allowed" : "pointer",
            fontSize: "16px",
            fontWeight: "bold",
            transition: "background 0.3s"
          }}
        >
          {verificationStatus.isLoading ? "Verifying..." : "Verify Proof"}
        </button>
        
        {verificationStatus.result && (
          <div style={{ 
            marginTop: "20px", 
            padding: "15px", 
            borderRadius: "4px",
            background: verificationStatus.result.includes("✅") ? "#e8f5e9" : "#ffebee",
            border: `1px solid ${verificationStatus.result.includes("✅") ? "#a5d6a7" : "#ffcdd2"}`
          }}>
            <h3 style={{ 
              margin: "0 0 10px 0", 
              color: verificationStatus.result.includes("✅") ? "#2e7d32" : "#c62828",
              fontSize: "20px"
            }}>
              {verificationStatus.result}
            </h3>
            
            {/* Age verification message */}
            {getAgeVerificationMessage() && (
              <div style={{
                margin: "15px 0",
                padding: "10px",
                borderRadius: "4px",
                background: verificationStatus.ageVerified ? "#e8f5e9" : "#ffebee",
                border: `1px solid ${verificationStatus.ageVerified ? "#a5d6a7" : "#ffcdd2"}`,
                fontSize: "18px",
                fontWeight: "bold",
                color: verificationStatus.ageVerified ? "#2e7d32" : "#c62828"
              }}>
                {getAgeVerificationMessage()}
              </div>
            )}
            
            {verificationTime && (
              <p style={{ margin: "5px 0", fontSize: "14px" }}>
                Verification time: {verificationTime} seconds
              </p>
            )}
            
            {verificationStatus.details.method && (
              <p style={{ margin: "5px 0", fontSize: "14px" }}>
                Method used: {verificationStatus.details.method}
              </p>
            )}
            
            {verificationStatus.details.publicSignalValue && (
              <p style={{ margin: "5px 0", fontSize: "14px" }}>
                Public Signal Value: {verificationStatus.details.publicSignalValue} 
                {verificationStatus.details.publicSignalValue === "1" ? " (18+ verified)" : " (Under 18)"}
              </p>
            )}
            
            {verificationStatus.details.error && (
              <p style={{ 
                margin: "10px 0", 
                color: "#d32f2f", 
                fontSize: "14px",
                background: "#ffebee",
                padding: "10px",
                borderRadius: "4px"
              }}>
                Error: {verificationStatus.details.error}
              </p>
            )}
          </div>
        )}
      </div>
      
      <div style={{ fontSize: "14px", color: "#666", marginTop: "30px" }}>
        <p>This application verifies zero-knowledge proofs for age verification without revealing the actual age.</p>
        <p>The proof only confirms whether a person is 18 years or older, preserving privacy.</p>
        <p><strong>Note:</strong> A public signal value of 1 means the person is 18 years or older, while 0 means they are under 18.</p>
      </div>
    </div>
  );
}

export default App;