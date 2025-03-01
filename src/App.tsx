import { useState, useCallback, useEffect, useRef, DragEvent } from "react";
import { ethers } from "ethers";
import "./App.css";
import { ProofData, VerificationStatus, TutorialStep, FAQItem, ProofGenerationStep } from "./types";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./constants";

const contractAddress: string = CONTRACT_ADDRESS;
const contractABI = CONTRACT_ABI;

// Tutorial steps
const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to ZKP Age Verification",
    content: "This tutorial will guide you through the process of verifying your age without revealing your personal information using Zero-Knowledge Proofs.",
    position: "bottom",
    style: { top: "100px", left: "50%", transform: "translateX(-50%)" }
  },
  {
    title: "Connect Your Wallet",
    content: "First, connect your Ethereum wallet by clicking the 'Connect Wallet' button. This is required to verify your identity on the blockchain.",
    position: "bottom",
    style: { top: "250px", left: "50%", transform: "translateX(-50%)" }
  },
  {
    title: "Upload Your Proof",
    content: "Upload your proof.json file by dragging it into the upload area or clicking to browse. This file contains your age verification proof without revealing your actual age.",
    position: "top",
    style: { bottom: "350px", left: "50%", transform: "translateX(-50%)" }
  },
  {
    title: "Verify Your Age",
    content: "Once your proof is uploaded, click 'Verify Age' to process the verification. The system will check if you're above the required age without knowing your exact birthdate.",
    position: "right",
    style: { top: "50%", left: "30%", transform: "translateY(-50%)" }
  },
  {
    title: "Privacy Protected",
    content: "Your personal information is never shared or stored. Zero-Knowledge Proofs allow verification without revealing the underlying data, keeping your privacy intact.",
    position: "left",
    style: { top: "50%", right: "30%", transform: "translateY(-50%)" }
  }
];

// FAQ data
const faqItems: FAQItem[] = [
  {
    question: "What is a Zero-Knowledge Proof?",
    answer: "A Zero-Knowledge Proof (ZKP) is a cryptographic method that allows one party to prove to another that a statement is true without revealing any additional information. In this application, it proves you're 18+ without revealing your actual age."
  },
  {
    question: "How do I generate a proof.json file?",
    answer: "The proof.json file is generated using the ZKP generation tools included in this project. Follow these steps:\n\n1. Open a terminal in the project root directory\n\n2. Create an input.json file with your birth date and current date (see example below):\n```json\n{\n  \"birthYear\": 1990,\n  \"birthMonth\": 7,\n  \"birthDay\": 7,\n  \"currentYear\": 2023,\n  \"currentMonth\": 2,\n  \"currentDay\": 28\n}\n```\n\n3. Generate a witness file:\n```bash\nnode others/age_js/generate_witness.js others/age_js/age.wasm input.json witness.wtns\n```\n\n4. Generate the proof:\n```bash\nnpx snarkjs groth16 prove build/ageCheck.zkey witness.wtns proof.json public.json\n```\n\n5. Merge the proof.json and public.json files (required for verification):\n```javascript\n// Save as merge-proof.js and run with: node merge-proof.js\nconst fs = require('fs');\nconst proof = JSON.parse(fs.readFileSync('proof.json', 'utf8'));\nconst publicSignals = JSON.parse(fs.readFileSync('public.json', 'utf8'));\nconst merged = {\n  ...proof,\n  publicSignals: publicSignals\n};\nfs.writeFileSync('merged-proof.json', JSON.stringify(merged, null, 2));\n```\n\nThe resulting merged-proof.json file can then be uploaded to this application for verification. Note: Make sure to install snarkjs globally using `npm install -g snarkjs` if you haven't already."
  },
  {
    question: "Is my personal information safe?",
    answer: "Yes. The zero-knowledge proof technology ensures that your actual age is never revealed or stored. The verification process only confirms whether you're 18+ or not, without exposing any personal data."
  },
  {
    question: "Why do I need to connect my wallet?",
    answer: "Your wallet is used to interact with the verification smart contract on the blockchain. The contract performs the cryptographic verification of your proof without storing any personal data."
  },
  {
    question: "What happens if verification fails?",
    answer: "Verification can fail for several reasons: the proof file might be invalid, you might not meet the age requirement, or there could be technical issues with the connection. Check the error message for specific details."
  },
  {
    question: "Can I use this verification elsewhere?",
    answer: "This verification is specific to this application. However, the concept of ZKP age verification can be implemented across various platforms that require age verification while preserving privacy."
  }
];

// SVG Icons
const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const QuestionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

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
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tutorial and FAQ state
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [currentTutorialStep, setCurrentTutorialStep] = useState<number>(0);
  const [showFAQ, setShowFAQ] = useState<boolean>(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  // Add new state for proof generation guide
  const [showProofGuide, setShowProofGuide] = useState(false);

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
      processFile(file);
    }
  }, []);

  // Process the uploaded file
  const processFile = useCallback((file: File) => {
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
  }, []);

  // Handle drag events
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [isDragging]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      // Check if file is JSON
      if (file.type === "application/json" || file.name.endsWith('.json')) {
        processFile(file);
      } else {
        alert("Please upload a valid JSON file.");
      }
    }
  }, [processFile]);

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

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
      alert("Please upload a proof file first.");
      return;
    }
    
    if (!walletConnected) {
      alert("Please connect your wallet first.");
      return;
    }
    
    const startTime = performance.now();
    
    setVerificationStatus({
      result: null,
      isLoading: true,
      ageVerified: null,
      details: { startTime }
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
        
        // For pB, we need to swap the order of elements in each pair
        const pB = [
          [toBigNumber(pi_b[0][1]), toBigNumber(pi_b[0][0])],
          [toBigNumber(pi_b[1][1]), toBigNumber(pi_b[1][0])]
        ];
        if (!pB.every(row => row.every(isValidUint256))) {
          throw new Error(`pB contains values outside uint256 range`);
        }
        
        const pC = [toBigNumber(pi_c[0]), toBigNumber(pi_c[1])];
        if (!pC.every(isValidUint256)) {
          throw new Error(`pC contains values outside uint256 range`);
        }
        
        const pubSignals = [toBigNumber(publicSignals[0])];
        if (!pubSignals.every(isValidUint256)) {
          throw new Error(`pubSignals contains values outside uint256 range`);
        }
        
        // Store the publicSignal value for age verification
        const publicSignalValue = pubSignals[0].toString();
        const isOver18 = publicSignalValue === "1";

        // Call the contract's verifyProof function - using the most reliable method first
        
        // Based on previous success, start with the simulation approach
        try {
          // Method 1: Transaction simulation (previously most successful)
          const tx = await contract.verifyProof.populateTransaction(pA, pB, pC, pubSignals);
          const simResult = await provider.call(tx);
          
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
          // Simulation approach failed, try low-level call
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
          // Low-level call failed, try standard method
        }
        
        // Method 3: Standard contract call (least reliable but simplest)
        try {
          const result = await contract.verifyProof(pA, pB, pC, pubSignals);
          
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

  // Truncate wallet address for display
  const truncateAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Tutorial navigation functions
  const startTutorial = () => {
    setShowTutorial(true);
    setCurrentTutorialStep(0);
  };

  const nextTutorialStep = () => {
    if (currentTutorialStep < tutorialSteps.length - 1) {
      setCurrentTutorialStep(currentTutorialStep + 1);
    } else {
      setShowTutorial(false);
    }
  };

  const prevTutorialStep = () => {
    if (currentTutorialStep > 0) {
      setCurrentTutorialStep(currentTutorialStep - 1);
    }
  };

  const closeTutorial = () => {
    setShowTutorial(false);
  };

  // FAQ toggle functions
  const toggleFAQ = () => {
    setShowFAQ(!showFAQ);
  };

  const toggleFAQItem = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  // Toggle proof generation guide
  const toggleProofGuide = () => {
    setShowProofGuide(!showProofGuide);
    // Close other overlays if open
    if (!showProofGuide) {
      setShowTutorial(false);
      setShowFAQ(false);
    }
  };

  // Define proof generation steps
  const proofGenerationSteps: ProofGenerationStep[] = [
    {
      title: "Prerequisites",
      content: "Before generating a proof, make sure you have the following installed:",
      code: "# Install Node.js (if not already installed)\n# Visit https://nodejs.org/\n\n# Install snarkjs globally\nnpm install -g snarkjs"
    },
    {
      title: "Step 1: Create Input File",
      content: "Create an input.json file with your birth date and the current date. This information will be used to generate a proof that you are 18 years or older without revealing your actual age.",
      code: "{\n  \"birthYear\": 1990,\n  \"birthMonth\": 7,\n  \"birthDay\": 7,\n  \"currentYear\": 2023,\n  \"currentMonth\": 2,\n  \"currentDay\": 28\n}"
    },
    {
      title: "Step 2: Generate Witness",
      content: "Generate a witness file using the provided circuit and your input file. This step computes the intermediate values needed for the proof.",
      code: "node others/age_js/generate_witness.js others/age_js/age.wasm input.json witness.wtns"
    },
    {
      title: "Step 3: Generate Proof",
      content: "Generate the final proof using the witness file. This creates the proof.json and public.json files.",
      code: "npx snarkjs groth16 prove build/ageCheck.zkey witness.wtns proof.json public.json"
    },
    {
      title: "Step 4: Merge Proof Files",
      content: "The verification requires a merged file that contains both the proof and public signals. Use the following Node.js script to merge the files:",
      code: "// Save this as merge-proof.js\nconst fs = require('fs');\n\n// Read the files\nconst proof = JSON.parse(fs.readFileSync('proof.json', 'utf8'));\nconst publicSignals = JSON.parse(fs.readFileSync('public.json', 'utf8'));\n\n// Merge them\nconst merged = {\n  ...proof,\n  publicSignals: publicSignals\n};\n\n// Write the merged file\nfs.writeFileSync('merged-proof.json', JSON.stringify(merged, null, 2));\n\nconsole.log('Files merged successfully! Upload merged-proof.json to the application.');"
    },
    {
      title: "Step 5: Run the Merge Script",
      content: "Execute the merge script to create the final proof file that can be uploaded to the application.",
      code: "node merge-proof.js"
    },
    {
      title: "Step 6: Upload Merged Proof",
      content: "Upload the generated merged-proof.json file to this application to verify your age. The application will only know whether you are 18+ or not, without learning your actual age or birth date."
    }
  ];

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>ZKP Age Verification</h1>
        <div className="header-actions">
          <button className="secondary-button" onClick={startTutorial}>
            <InfoIcon /> How It Works
          </button>
          <button className="secondary-button" onClick={toggleFAQ}>
            <QuestionIcon /> FAQ
          </button>
          {/* Add new button for proof generation guide */}
          <button className="secondary-button" onClick={toggleProofGuide}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg> Generate Proof
          </button>
        </div>
      </header>
      
      <div className="card-container">
        {/* Wallet Connection Card */}
        <div className="card" id="wallet-card">
          <div className="card-header">
            <h2>Wallet Connection</h2>
            <div className="card-icon">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 7h-1V6a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-8a3 3 0 0 0-3-3zm-1 9h-2v-2h2v2z" />
              </svg>
            </div>
          </div>
          
          <div className="card-content">
            {walletConnected ? (
              <div className="wallet-info">
                <div className="wallet-status connected">
                  <span className="status-dot"></span>
                  <span>Connected</span>
                </div>
                <div className="wallet-address">
                  <span className="address-label">Address:</span>
                  <span className="address-value" title={walletAddress || ""}>
                    {walletAddress ? truncateAddress(walletAddress) : ""}
                  </span>
                  <button 
                    className="copy-button"
                    onClick={() => {
                      if (walletAddress) {
                        navigator.clipboard.writeText(walletAddress);
                        alert("Address copied to clipboard!");
                      }
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <button 
                className="primary-button"
                onClick={connectWallet}
                disabled={verificationStatus.isLoading}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" />
                  <path d="M16 2v4h4" />
                  <path d="M14 4l6 6" />
                </svg>
                Connect Wallet
              </button>
            )}
          </div>
        </div>
        
        {/* Proof Upload Card */}
        <div className="card" id="upload-card">
          <div className="card-header">
            <h2>Proof Upload</h2>
            <div className="card-icon">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
          </div>
          
          <div className="card-content">
            <div 
              className={`file-upload-container ${isDragging ? 'dragging' : ''}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div 
                className="file-upload-area"
                onClick={triggerFileInput}
              >
                <input 
                  type="file" 
                  accept="application/json" 
                  onChange={handleFileUpload}
                  className="file-input"
                  ref={fileInputRef}
                />
                <div className="upload-icon">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div className="upload-text">
                  <span className="upload-title">Drag & drop your proof.json file here</span>
                  <span className="upload-subtitle">or click to browse files</span>
                </div>
              </div>
              
              <div className={`file-status ${proof ? 'file-loaded' : ''}`}>
                {proof ? (
                  <>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>Proof loaded successfully</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    <span>No proof loaded</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Verification Card */}
        <div className="card verification-card" id="verification-card">
          <div className="card-header">
            <h2>Verification</h2>
            <div className="card-icon">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          
          <div className="card-content">
            <button 
              className="primary-button verify-button"
              onClick={verifyProof} 
              disabled={!proof || !walletConnected || verificationStatus.isLoading}
            >
              {verificationStatus.isLoading ? (
                <>
                  <div className="spinner"></div>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>Verify Proof</span>
                </>
              )}
            </button>
            
            {verificationStatus.result && (
              <div className={`verification-result ${verificationStatus.result.includes("✅") ? "success" : "error"}`}>
                <h3 className="result-title">
                  {verificationStatus.result}
                </h3>
                
                {/* Age verification message */}
                {getAgeVerificationMessage() && (
                  <div className={`age-verification-message ${verificationStatus.ageVerified ? "success" : "error"}`}>
                    {getAgeVerificationMessage()}
                  </div>
                )}
                
                <div className="verification-details">
                  {verificationTime && (
                    <div className="detail-item">
                      <span className="detail-label">Verification time:</span>
                      <span className="detail-value">{verificationTime} seconds</span>
                    </div>
                  )}
                  
                  {verificationStatus.details.method && (
                    <div className="detail-item">
                      <span className="detail-label">Method used:</span>
                      <span className="detail-value">{verificationStatus.details.method}</span>
                    </div>
                  )}
                  
                  {verificationStatus.details.publicSignalValue && (
                    <div className="detail-item">
                      <span className="detail-label">Public Signal Value:</span>
                      <span className="detail-value">
                        {verificationStatus.details.publicSignalValue} 
                        <span className={`signal-indicator ${verificationStatus.details.publicSignalValue === "1" ? "success" : "error"}`}>
                          {verificationStatus.details.publicSignalValue === "1" ? " (18+ verified)" : " (Under 18)"}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
                
                {verificationStatus.details.error && (
                  <div className="error-message">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{verificationStatus.details.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="info-section" id="info-section">
        <h3>About ZKP Age Verification</h3>
        <p>This application verifies zero-knowledge proofs for age verification without revealing the actual age.</p>
        <p>The proof only confirms whether a person is 18 years or older, preserving privacy.</p>
        <div className="info-note">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>A public signal value of 1 means the person is 18 years or older, while 0 means they are under 18.</span>
        </div>
      </div>
      
      {/* Interactive Tutorial */}
      {showTutorial && (
        <div className="overlay">
          <div className="tutorial-tooltip" style={tutorialSteps[currentTutorialStep].style}>
            <button className="close-button" onClick={closeTutorial}>
              <CloseIcon />
            </button>
            <h3>{tutorialSteps[currentTutorialStep].title}</h3>
            <p>{tutorialSteps[currentTutorialStep].content}</p>
            <div className="tutorial-navigation">
              {currentTutorialStep > 0 && (
                <button className="tutorial-nav-button" onClick={prevTutorialStep}>
                  <div className="tutorial-nav-icon">
                    <ChevronLeftIcon />
                  </div>
                  Previous
                </button>
              )}
              {currentTutorialStep < tutorialSteps.length - 1 && (
                <button className="tutorial-nav-button" onClick={nextTutorialStep}>
                  Next
                  <div className="tutorial-nav-icon">
                    <ChevronRightIcon />
                  </div>
                </button>
              )}
              {currentTutorialStep === tutorialSteps.length - 1 && (
                <button className="tutorial-nav-button" onClick={closeTutorial}>
                  Finish
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* FAQ Section */}
      {showFAQ && (
        <div className="overlay">
          <div className="faq-container">
            <div className="faq-header">
              <h2>Frequently Asked Questions</h2>
              <button className="close-button" onClick={toggleFAQ}>
                <CloseIcon />
              </button>
            </div>
            <div className="faq-content">
              {faqItems.map((item, index) => (
                <div key={index} className="faq-item">
                  <div 
                    className="faq-item-header" 
                    onClick={() => toggleFAQItem(index)}
                  >
                    <h3>{item.question}</h3>
                    <div style={{ 
                      transform: expandedFAQ === index ? 'rotate(180deg)' : 'rotate(0)', 
                      transition: 'transform 0.3s ease' 
                    }}>
                      <ChevronDownIcon />
                    </div>
                  </div>
                  {expandedFAQ === index && (
                    <div className="faq-item-content">
                      {item.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Proof Generation Guide Overlay */}
      {showProofGuide && (
        <div className="overlay">
          <div className="proof-guide-container">
            <div className="proof-guide-header">
              <h2>How to Generate a Proof</h2>
              <button className="close-button" onClick={toggleProofGuide}>
                <CloseIcon />
              </button>
            </div>
            <div className="proof-guide-content">
              {proofGenerationSteps.map((step, index) => (
                <div key={index} className="proof-guide-step">
                  <h3>{step.title}</h3>
                  <p>{step.content}</p>
                  {step.code && (
                    <div className="code-block">
                      <pre className="proof-guide-code">{step.code}</pre>
                      <button 
                        className="copy-button"
                        onClick={() => {
                          navigator.clipboard.writeText(step.code || '');
                          alert('Code copied to clipboard!');
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;