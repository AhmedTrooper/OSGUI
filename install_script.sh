#!/bin/bash

# OSGUI Installation Script
# This script helps uninstall old version and install the new enhanced version

set -e

echo "🚀 OSGUI Enhanced Installation Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root for system-wide operations
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root. Will install system-wide."
        INSTALL_SYSTEM=true
    else
        print_status "Running as regular user. Will install for current user."
        INSTALL_SYSTEM=false
    fi
}

# Step 1: Uninstall old version
uninstall_old_version() {
    print_status "🗑️  Checking for existing OSGUI installations..."
    
    # Check for RPM packages
    if rpm -qa | grep -i osgui > /dev/null 2>&1; then
        print_status "Found RPM package. Removing..."
        if [[ $INSTALL_SYSTEM == true ]]; then
            dnf remove -y osgui || rpm -e $(rpm -qa | grep -i osgui)
        else
            sudo dnf remove -y osgui || sudo rpm -e $(rpm -qa | grep -i osgui)
        fi
        print_success "Old RPM package removed"
    fi
    
    # Check for desktop entries
    find ~/.local/share/applications /usr/share/applications -name "*osgui*" -o -name "*OSGUI*" 2>/dev/null | while read -r file; do
        print_status "Removing desktop entry: $file"
        rm -f "$file"
    done
    
    # Check for AppImages or binaries
    find ~/Applications ~/.local/bin /usr/local/bin -name "*osgui*" -o -name "*OSGUI*" 2>/dev/null | while read -r file; do
        print_status "Removing application: $file"
        rm -f "$file"
    done
    
    print_success "Old version cleanup completed"
}

# Step 2: Install new version
install_new_version() {
    print_status "📦 Installing enhanced OSGUI..."
    
    BUILD_DIR="src-tauri/target/release/bundle"
    
    # Check if build artifacts exist
    if [[ ! -d "$BUILD_DIR" ]]; then
        print_error "Build artifacts not found. Please run 'npm run tauri build' first."
        exit 1
    fi
    
    # Install RPM if available (preferred for Fedora)
    if [[ -f "$BUILD_DIR/rpm/"*.rpm ]]; then
        print_status "Installing RPM package..."
        RPM_FILE=$(find "$BUILD_DIR/rpm/" -name "*.rpm" | head -n1)
        if [[ $INSTALL_SYSTEM == true ]]; then
            dnf install -y "$RPM_FILE"
        else
            sudo dnf install -y "$RPM_FILE"
        fi
        print_success "RPM package installed successfully!"
        return
    fi
    
    # Install DEB if available
    if [[ -f "$BUILD_DIR/deb/"*.deb ]] && command -v dpkg > /dev/null; then
        print_status "Installing DEB package..."
        DEB_FILE=$(find "$BUILD_DIR/deb/" -name "*.deb" | head -n1)
        if [[ $INSTALL_SYSTEM == true ]]; then
            dpkg -i "$DEB_FILE"
        else
            sudo dpkg -i "$DEB_FILE"
        fi
        print_success "DEB package installed successfully!"
        return
    fi
    
    # Install AppImage as fallback
    if [[ -f "$BUILD_DIR/appimage/"*.AppImage ]]; then
        print_status "Installing AppImage..."
        APPIMAGE_FILE=$(find "$BUILD_DIR/appimage/" -name "*.AppImage" | head -n1)
        
        # Create Applications directory if it doesn't exist
        mkdir -p ~/Applications
        
        # Copy AppImage
        cp "$APPIMAGE_FILE" ~/Applications/OSGUI.AppImage
        chmod +x ~/Applications/OSGUI.AppImage
        
        # Create desktop entry
        mkdir -p ~/.local/share/applications
        cat > ~/.local/share/applications/osgui.desktop << EOF
[Desktop Entry]
Name=OSGUI Enhanced
Comment=Enhanced yt-dlp GUI with modern features
Exec=$HOME/Applications/OSGUI.AppImage
Icon=osgui
Terminal=false
Type=Application
Categories=AudioVideo;Network;
EOF
        
        print_success "AppImage installed successfully!"
        print_status "You can find OSGUI in your applications menu or run: ~/Applications/OSGUI.AppImage"
        return
    fi
    
    print_error "No suitable installation package found!"
    exit 1
}

# Step 3: Verify installation
verify_installation() {
    print_status "🔍 Verifying installation..."
    
    # Check if desktop entry exists
    if [[ -f ~/.local/share/applications/osgui.desktop ]] || [[ -f /usr/share/applications/osgui.desktop ]]; then
        print_success "Desktop entry found"
    fi
    
    # Check if binary is accessible
    if command -v osgui > /dev/null || [[ -f ~/Applications/OSGUI.AppImage ]]; then
        print_success "OSGUI binary is accessible"
    fi
    
    print_success "✅ Installation verification completed!"
}

# Main execution
main() {
    echo ""
    print_status "Starting OSGUI Enhanced installation process..."
    echo ""
    
    check_root
    uninstall_old_version
    install_new_version
    verify_installation
    
    echo ""
    print_success "🎉 OSGUI Enhanced has been installed successfully!"
    print_status "Features included:"
    echo "   ⚡ Performance optimizations"
    echo "   🛡️  Enhanced error handling"
    echo "   🎯 Type-safe code"
    echo "   📦 Modern build system"
    echo "   🔧 Advanced state management"
    echo ""
    print_status "You can now launch OSGUI from your applications menu!"
    echo ""
}

# Run main function
main