#!/bin/bash
# Shell Scripting Skills Showcase
# Demonstrates: bash scripting, error handling, functions, automation

set -euo pipefail  # Exit on error, undefined variables, pipe failures

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Global variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/automation.log"
VERBOSE=false

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Error handler
error_handler() {
    local line_no=$1
    log_error "Script failed at line ${line_no}"
    exit 1
}

trap 'error_handler ${LINENO}' ERR

# Display usage information
usage() {
    cat <<EOF
Usage: $0 [OPTIONS] COMMAND

Skills Showcase Automation Script

COMMANDS:
    setup           Setup development environment
    test            Run all tests
    build           Build the project
    deploy          Deploy to environment
    clean           Clean build artifacts
    check-deps      Check system dependencies

OPTIONS:
    -h, --help      Show this help message
    -v, --verbose   Enable verbose output
    -e, --env       Specify environment (dev|staging|prod)

EXAMPLES:
    $0 setup
    $0 -v test
    $0 -e prod deploy
EOF
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check system dependencies
check_dependencies() {
    log_info "Checking system dependencies..."

    local deps=("git" "python3" "node" "npm")
    local missing_deps=()

    for dep in "${deps[@]}"; do
        if command_exists "$dep"; then
            log_success "✓ $dep found"
        else
            log_warn "✗ $dep not found"
            missing_deps+=("$dep")
        fi
    done

    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        return 1
    fi

    log_success "All dependencies satisfied"
}

# Setup development environment
setup_environment() {
    log_info "Setting up development environment..."

    # Create necessary directories
    local dirs=("build" "dist" "logs" "tmp")
    for dir in "${dirs[@]}"; do
        if [ ! -d "${SCRIPT_DIR}/${dir}" ]; then
            mkdir -p "${SCRIPT_DIR}/${dir}"
            log_success "Created directory: ${dir}"
        fi
    done

    # Initialize configuration
    if [ ! -f "${SCRIPT_DIR}/.env" ]; then
        cat > "${SCRIPT_DIR}/.env" <<EOF
# Environment Configuration
NODE_ENV=development
LOG_LEVEL=info
PORT=8080
EOF
        log_success "Created .env file"
    fi

    log_success "Environment setup complete"
}

# Run tests with retry logic
run_tests() {
    log_info "Running test suite..."

    local max_retries=3
    local retry_count=0

    while [ $retry_count -lt $max_retries ]; do
        if python3 -m pytest "${SCRIPT_DIR}/test_python.py" -v; then
            log_success "All tests passed"
            return 0
        else
            retry_count=$((retry_count + 1))
            log_warn "Tests failed, retry ${retry_count}/${max_retries}"
            sleep 2
        fi
    done

    log_error "Tests failed after ${max_retries} attempts"
    return 1
}

# Build project
build_project() {
    log_info "Building project..."

    # Syntax check
    log_info "Running syntax checks..."
    python3 -m py_compile "${SCRIPT_DIR}"/python_example.py

    # Type checking (if mypy available)
    if command_exists mypy; then
        mypy "${SCRIPT_DIR}"/python_example.py || log_warn "Type check warnings"
    fi

    log_success "Build complete"
}

# Clean build artifacts
clean_artifacts() {
    log_info "Cleaning build artifacts..."

    local patterns=("*.pyc" "__pycache__" "*.log" "build/*" "dist/*")

    for pattern in "${patterns[@]}"; do
        find "${SCRIPT_DIR}" -name "$pattern" -exec rm -rf {} + 2>/dev/null || true
    done

    log_success "Cleanup complete"
}

# Deploy to environment
deploy() {
    local env=${1:-dev}

    log_info "Deploying to ${env} environment..."

    case "$env" in
        dev)
            log_info "Running development deployment..."
            ;;
        staging)
            log_info "Running staging deployment..."
            ;;
        prod)
            log_warn "Production deployment requires confirmation"
            read -p "Are you sure? (yes/no): " confirm
            if [ "$confirm" != "yes" ]; then
                log_info "Deployment cancelled"
                return 0
            fi
            ;;
        *)
            log_error "Invalid environment: ${env}"
            return 1
            ;;
    esac

    log_success "Deployment to ${env} complete"
}

# Monitor system resources
monitor_resources() {
    log_info "System Resources:"
    echo "----------------------------------------"
    echo "CPU Usage:"
    top -bn1 | grep "Cpu(s)" || echo "N/A"
    echo ""
    echo "Memory Usage:"
    free -h || echo "N/A"
    echo ""
    echo "Disk Usage:"
    df -h "${SCRIPT_DIR}" || echo "N/A"
    echo "----------------------------------------"
}

# Backup important files
backup_files() {
    local backup_dir="${SCRIPT_DIR}/backups/$(date +%Y%m%d_%H%M%S)"

    log_info "Creating backup at ${backup_dir}..."

    mkdir -p "$backup_dir"

    # Files to backup
    local files=("*.py" "*.ts" "*.rs" "*.yaml" "*.sh")

    for pattern in "${files[@]}"; do
        find "${SCRIPT_DIR}" -maxdepth 1 -name "$pattern" -exec cp {} "$backup_dir" \; 2>/dev/null || true
    done

    log_success "Backup complete at ${backup_dir}"
}

# Main execution
main() {
    local command=""
    local env="dev"

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -h|--help)
                usage
                exit 0
                ;;
            -v|--verbose)
                VERBOSE=true
                set -x
                shift
                ;;
            -e|--env)
                env="$2"
                shift 2
                ;;
            setup|test|build|deploy|clean|check-deps|monitor|backup)
                command="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done

    # Execute command
    case "$command" in
        setup)
            check_dependencies
            setup_environment
            ;;
        test)
            run_tests
            ;;
        build)
            build_project
            ;;
        deploy)
            deploy "$env"
            ;;
        clean)
            clean_artifacts
            ;;
        check-deps)
            check_dependencies
            ;;
        monitor)
            monitor_resources
            ;;
        backup)
            backup_files
            ;;
        *)
            log_error "No command specified"
            usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
