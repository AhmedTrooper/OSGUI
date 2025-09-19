#!/bin/bash

echo "🚀 OSGUI Quick Uninstall/Install"
echo "================================="

# Uninstall old version
echo "Removing old version..."
sudo dnf remove -y osgui* 2>/dev/null || true
rm -f ~/.local/share/applications/*osgui*.desktop 2>/dev/null || true
rm -rf ~/.config/OSGUI ~/.local/share/OSGUI 2>/dev/null || true

# Install new version
echo "Installing enhanced version..."

# Check for built binary
if [[ -f "src-tauri/target/release/OSGUI" ]]; then
    echo "✅ Binary built successfully!"
    
    # Create applications directory
    mkdir -p ~/Applications
    
    # Copy binary
    cp src-tauri/target/release/OSGUI ~/Applications/OSGUI
    chmod +x ~/Applications/OSGUI
    
    # Create desktop entry
    mkdir -p ~/.local/share/applications
    cat > ~/.local/share/applications/osgui-enhanced.desktop << 'EOF'
[Desktop Entry]
Name=OSGUI Enhanced
Comment=Enhanced yt-dlp GUI with modern features and optimizations
Exec=%h/Applications/OSGUI
Icon=osgui
Terminal=false
Type=Application
Categories=AudioVideo;Network;Qt;
StartupNotify=true
EOF
    
    # Update desktop database
    update-desktop-database ~/.local/share/applications/ 2>/dev/null || true
    
    echo "✅ OSGUI Enhanced installed successfully!"
    echo "📍 Location: ~/Applications/OSGUI"
    echo "🖥️  Desktop entry: ~/.local/share/applications/osgui-enhanced.desktop"
    echo ""
    echo "You can now:"
    echo "• Launch from applications menu"
    echo "• Run: ~/Applications/OSGUI"
    echo "• Double-click the desktop file"
    echo ""
    echo "🎉 Enjoy your enhanced OSGUI with all the new features!"
else
    echo "❌ Build not found. Please run 'npm run tauri build' first."
    exit 1
fi