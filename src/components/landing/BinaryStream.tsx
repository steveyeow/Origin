import { motion } from 'framer-motion';
import React from 'react';

export const BinaryStream = () => {
  const streamPatterns = [
    '[ SYSTEM_CORE_ACTIVE ]',
    '[ QUANTUM_SYNC_ENABLED ]',
    '[ NEURAL_BRIDGE_CONNECTED ]',
    '[ MEMORY_BUFFER_STABLE ]',
    '> initializing_neural_pathways',
    '> optimizing_quantum_states',
    '[ SYNAPTIC_LINK_VERIFIED ]',
    '[ CONSCIOUSNESS_MATRIX_STABLE ]',
    '> calibrating_ai_cores',
    '[ QUANTUM_ENTANGLEMENT_READY ]'
  ];

  const [flashingElements, setFlashingElements] = React.useState<Array<{
    id: number;
    pattern: string;
    position: { top: number; left: number };
  }>>([]);

  const getNewPosition = (existingPositions: Array<{ top: number; left: number }>) => {
    let attempts = 0;
    while (attempts < 100) {
      const newPos = {
        top: Math.random() * 100,
        left: Math.random() * 100
      };
      
      const isOverlapping = existingPositions.some(pos => 
        Math.abs(pos.top - newPos.top) < 10 && 
        Math.abs(pos.left - newPos.left) < 15
      );
      
      if (!isOverlapping) return newPos;
      attempts++;
    }
    return null;
  };

  const getNewPattern = (usedPatterns: string[]) => {
    const allPatterns = [
      `[ NEURAL_SYNC: ${(Math.random() * 0.2 + 0.8).toFixed(3)} ]`,
      `[ SYNAPSE_ACTIVITY: ${Math.floor(Math.random() * 1000 + 9000)} ]`,
      `[ NEURAL_PLASTICITY: ${(Math.random() * 0.3 + 0.7).toFixed(2)} ]`,
      
      `[ QUANTUM_ENTANGLEMENT: ${(Math.random() * 20 + 80).toFixed(1)}% ]`,
      `[ QUBIT_COHERENCE: ${(Math.random() * 0.1 + 0.9).toFixed(3)} ]`,
      `[ QUANTUM_STATE_VECTOR: ${Math.floor(Math.random() * 1000)}q ]`,
      
      `[ DEEP_LEARNING_DEPTH: ${Math.floor(Math.random() * 100 + 900)} ]`,
      `[ ATTENTION_ENTROPY: ${(Math.random() * 0.5 + 0.5).toFixed(3)} ]`,
      `[ MODEL_TEMPERATURE: ${(Math.random() * 0.7 + 0.3).toFixed(2)} ]`,
      
      '[ QUANTUM_SUPREMACY_ACHIEVED ]',
      '[ NEURAL_BREAKTHROUGH_DETECTED ]',
      '[ CONSCIOUSNESS_EMERGENCE_WARNING ]'
    ];
    
    const availablePatterns = allPatterns.filter(p => !usedPatterns.includes(p));
    return availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
  };

  React.useEffect(() => {
    const interval = setInterval(() => {
      setFlashingElements(prev => {
        const current = prev.filter(el => el.id > Date.now() - 5000);
        
        if (current.length < 12) {
          const usedPatterns = current.map(el => el.pattern);
          const usedPositions = current.map(el => el.position);
          
          const newPosition = getNewPosition(usedPositions);
          if (newPosition) {
            const newPattern = getNewPattern(usedPatterns);
            if (newPattern) {
              current.push({
                id: Date.now() + Math.random(),
                pattern: newPattern,
                position: newPosition
              });
            }
          }
        }
        
        return current;
      });
    }, 300); // check every 300ms

    return () => clearInterval(interval);
  }, []);



  return (
    <div className="absolute inset-0 overflow-hidden">
        {/* Background binary streams - more subtle */}
        {[...Array(5)].map((_, index) => (
          <div
            key={`stream-${index}`}
            className="absolute top-0 h-full"
            style={{
              left: `${index * 20}%`,
              width: '500px',
              overflow: 'hidden',
              opacity: 0.15, // Reduced opacity for subtler effect
              zIndex: 1,
            }}
          >
            <motion.div
              className="absolute top-0 w-full"
              initial={{ y: 0 }}
              animate={{ y: '-100%' }} // Always flows upward
              transition={{
                duration: 120 + (index * 20), // Varied speeds for more natural effect
                repeat: Infinity,
                ease: "linear",
                repeatType: "loop"
              }}
            >
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className="font-mono whitespace-pre relative"
                  style={{
                    fontSize: '9px',
                    lineHeight: '3',
                    color: index % 2 === 0 ? 'rgba(57, 255, 20, 0.8)' : 'rgba(0, 157, 255, 0.7)', // Alternating colors with higher opacity
                    textShadow: index % 2 === 0 
                      ? '0 0 12px rgba(57, 255, 20, 0.5), 0 0 20px rgba(57, 255, 20, 0.3)' 
                      : '0 0 12px rgba(0, 157, 255, 0.5), 0 0 20px rgba(0, 157, 255, 0.3)', // Enhanced glow effect
                  }}
                >
                  {streamPatterns[Math.floor(Math.random() * streamPatterns.length)]}
                </div>
              ))}
            </motion.div>
          </div>
        ))}

        {/* Dynamic flashing elements with enhanced visibility */}
        {flashingElements.map(element => (
          <motion.div
            key={element.id}
            className="absolute font-mono whitespace-pre"
            style={{
              top: `${element.position.top}%`,
              left: `${element.position.left}%`,
              fontSize: '9px',
              fontWeight: 'medium',
              zIndex: 2,
              color: element.pattern.includes('NEURAL') 
                ? 'rgba(0, 157, 255, 0.8)' // Increased opacity for better visibility
                : element.pattern.includes('QUANTUM')
                  ? 'rgba(57, 255, 20, 0.8)' 
                  : 'rgba(200, 200, 255, 0.7)', 
              textShadow: element.pattern.includes('NEURAL')
                ? '0 0 8px rgba(0, 157, 255, 0.5), 0 0 16px rgba(0, 157, 255, 0.3)'
                : element.pattern.includes('QUANTUM')
                  ? '0 0 8px rgba(57, 255, 20, 0.5), 0 0 16px rgba(57, 255, 20, 0.3)'
                  : '0 0 8px rgba(200, 200, 255, 0.5), 0 0 16px rgba(200, 200, 255, 0.3)',
              backdropFilter: 'blur(2px)',
            }}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0.95, 1.05, 0.98],
              y: [10, 0, -5], // Subtle upward movement to enhance flow effect
            }}
            transition={{
              duration: Math.random() * 0.8 + 1.5, // Longer duration for better visibility
              ease: "easeInOut",
            }}
            onAnimationComplete={() => {
              setFlashingElements(prev => 
                prev.filter(el => el.id !== element.id)
              );
            }}
          >
            {element.pattern}
          </motion.div>
        ))}
      </div>    
  );
};
