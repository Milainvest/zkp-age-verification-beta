# ZKP Age Verification Dapp

A privacy-preserving application that verifies if a person is 18 years or older using Zero-Knowledge Proofs (ZKP) technology, without revealing their actual age.

## Overview

This decentralized application (Dapp) allows users to verify their age eligibility (18+) without disclosing their actual birth date or age. It uses zero-knowledge proofs to maintain privacy while providing cryptographic verification.

### How It Works

1. Users generate a proof (using a separate ZKP generation tool) that proves they are 18 years or older
2. The proof is uploaded to this Dapp
3. The Dapp verifies the proof using a smart contract
4. The verification result only indicates whether the person is 18+ or not, without revealing any additional information

## Features

- **Privacy-Preserving**: Uses zero-knowledge proofs to verify age without revealing actual age
- **Blockchain Integration**: Connects to Ethereum-compatible wallets (MetaMask)
- **Multiple Verification Methods**: Implements three different verification approaches for reliability
- **Detailed Feedback**: Provides verification status, timing, and method information
- **User-Friendly Interface**: Clean, responsive design with clear status indicators

## Technical Details

### Public Signal Interpretation

- **Public Signal = 1**: Person is 18 years or older
- **Public Signal = 0**: Person is under 18 years old

### Verification Methods

The application attempts verification using three methods in order of reliability:

1. **Transaction Simulation**: Simulates the verification without sending a transaction
2. **Low-Level Contract Call**: Makes a direct call to the contract with manually encoded data
3. **Standard Contract Call**: Uses the standard ethers.js contract call method

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn
- MetaMask or another Ethereum-compatible wallet

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/zkp-age-verification-beta.git
   cd zkp-age-verification-beta
   ```

2. Install dependencies:
   ```
   npm install
   # or
   yarn
   ```

3. Set up environment variables:
   - Create a `.env` file in the root directory
   - Add the following variables:
   ```
   ALCHEMY_API_KEY=your_alchemy_api_key_here
   WALLET_PRIVATE_KEY=your_wallet_private_key_here
   ```
   
   > **IMPORTANT**: Never commit your `.env` file or expose your private keys. The `.env` file is included in `.gitignore` to prevent accidental commits.

4. Start the development server:
   ```
   npm run dev
   # or
   yarn dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Usage

1. **Connect Wallet**: Click the "Connect Wallet" button to connect your Ethereum wallet
2. **Upload Proof**: Use the file input to upload your proof.json file
3. **Verify**: Click the "Verify Proof" button to check if the proof is valid
4. **View Results**: The application will display whether the person is 18+ or not, along with verification details

## Smart Contract

The application interacts with a Verifier smart contract deployed at:
```
0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## Development

This project is built with:

- React
- TypeScript
- Vite
- ethers.js (for blockchain interaction)

### Project Structure

- `src/App.tsx`: Main application component with verification logic
- `src/App.css`: Styling for the application

## Security Considerations

When deploying this application:

1. **Environment Variables**: Never expose your private keys or API keys. Use environment variables and ensure `.env` files are not committed to version control.

2. **Contract Verification**: The smart contract should be verified on the blockchain explorer to allow users to inspect its code.

3. **Proof Generation**: The proof generation process should be secure and tamper-proof. Consider providing a separate, secure tool for generating proofs.

4. **Frontend Security**: Implement proper input validation and sanitization to prevent XSS and other frontend attacks.

5. **Regular Audits**: Regularly audit the codebase and smart contracts for security vulnerabilities.

## Deployment

For production deployment:

1. Build the application:
   ```
   npm run build
   # or
   yarn build
   ```

2. Deploy the built files to your preferred hosting service (Vercel, Netlify, AWS, etc.)

## License

[MIT License](LICENSE)

## Acknowledgments

- This project uses the [Vite](https://vitejs.dev/) build tool
- Blockchain interaction is handled by [ethers.js](https://docs.ethers.org/)
