#!/bin/bash

# Function to check if a file exists and is not empty
check_file() {
    if [ ! -f "$1" ] || [ ! -s "$1" ]; then
        echo "Error: $1 is missing or empty"
        return 1
    fi
    return 0
}

# Function to check if an environment variable exists in .env file
check_env_var() {
    local var_name=$1
    if ! grep -q "^${var_name}=" .env; then
        echo "Error: ${var_name} is missing in .env file"
        return 1
    fi
    
    # Check if the value is empty or invalid
    local value=$(grep "^${var_name}=" .env | cut -d'=' -f2)
    if [ -z "$value" ]; then
        echo "Error: ${var_name} has empty value in .env file"
        return 1
    fi
    
    # For addresses, check if they start with 0x and are 42 characters long
    if [[ $var_name == *"ADDRESS" ]]; then
        if [[ ! $value =~ ^0x[a-fA-F0-9]{40}$ ]]; then
            echo "Error: ${var_name} has invalid address format: ${value}"
            return 1
        fi
    fi
    
    return 0
}

# Check for required files
check_file ".env" || exit 1

# Check for required environment variables
required_vars=(
    "VITE_DELEGATION_MANAGER_ADDRESS"
    "VITE_ENTRYPOINT_ADDRESS"
    "VITE_HYBRID_DELEGATOR_ADDRESS"
    "VITE_CHAIN_ID"
)

for var in "${required_vars[@]}"; do
    check_env_var "$var" || exit 1
done

echo "All required environment variables are present and valid"

# Display environment variables for verification
echo "Environment Variables:"
for var in "${required_vars[@]}"; do
    value=$(grep "^${var}=" .env | cut -d'=' -f2)
    echo "${var}=${value}"
done

# Start the development server
echo "Starting development server..."
npm run dev 