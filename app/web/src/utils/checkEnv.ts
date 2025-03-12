/**
 * Checks if all required environment variables are set
 * @returns An object with the status of each environment variable
 */
export function checkEnvironmentVariables() {
  const requiredVars = [
    'VITE_DELEGATION_MANAGER_ADDRESS',
    'VITE_ENTRYPOINT_ADDRESS',
    'VITE_HYBRID_DELEGATOR_ADDRESS',
    'VITE_CHAIN_ID'
  ];

  const optionalVars = [
    'VITE_SIMPLE_FACTORY_ADDRESS',
    'VITE_ALLOWED_TARGETS_ENFORCER_ADDRESS',
    'VITE_VALUE_LTE_ENFORCER_ADDRESS'
  ];

  const status = {
    allRequired: true,
    missing: [] as string[],
    present: [] as string[],
    optional: {} as Record<string, boolean>
  };

  // Check required variables
  for (const varName of requiredVars) {
    const value = import.meta.env[varName];
    if (!value) {
      status.allRequired = false;
      status.missing.push(varName);
    } else {
      status.present.push(varName);
    }
  }

  // Check optional variables
  for (const varName of optionalVars) {
    const value = import.meta.env[varName];
    status.optional[varName] = !!value;
  }

  return status;
}

/**
 * Logs the status of environment variables
 */
export function logEnvironmentStatus() {
  const status = checkEnvironmentVariables();
  
  console.log('Environment variables status:');
  console.log('All required variables present:', status.allRequired);
  
  if (status.missing.length > 0) {
    console.error('Missing required variables:', status.missing);
  }
  
  console.log('Present required variables:', status.present);
  console.log('Optional variables:', status.optional);
  
  return status.allRequired;
} 