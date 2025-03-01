// Define types for the proof data
export interface ProofData {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    publicSignals: string[];
  }
  
  // Define verification status type for better UI feedback
  export interface VerificationStatus {
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
  
  // Define tutorial step type
  export interface TutorialStep {
    title: string;
    content: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    style?: React.CSSProperties;
  };
  
  // Define FAQ item type
  export interface FAQItem {
    question: string;
    answer: string;
  };
  
  // Add new type for the proof generation guide
  export interface ProofGenerationStep {
    title: string;
    content: string;
    code?: string;
  };