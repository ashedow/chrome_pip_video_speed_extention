(function() {
    // Array of playback speeds
    const speeds = [1.0, 1.25, 1.5, 2.0, 2.5, 3.0];
    let currentSpeedIndex = 0;
    
    // Create or retrieve the control panel
    function createControlPanel() {
      let controlPanel = document.getElementById("video-control-panel");
      if (!controlPanel) {
        controlPanel = document.createElement("div");
        controlPanel.id = "video-control-panel";
        controlPanel.style.position = "fixed";
        controlPanel.style.bottom = "20px";
        controlPanel.style.right = "20px";
        controlPanel.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        controlPanel.style.padding = "10px";
        controlPanel.style.borderRadius = "5px";
        controlPanel.style.zIndex = "9999";
        document.body.appendChild(controlPanel);
        
        // Create PiP button
        const pipButton = document.createElement("button");
        pipButton.innerText = "Toggle PiP";
        pipButton.addEventListener("click", togglePiP);
        controlPanel.appendChild(pipButton);
        
        // Create Speed button
        const speedButton = document.createElement("button");
        speedButton.id = "speed-button";
        speedButton.innerText = "Speed: " + speeds[currentSpeedIndex] + "x";
        speedButton.addEventListener("click", cycleSpeed);
        controlPanel.appendChild(speedButton);
      }
    }

    // Get current active video element; here we choose the first visible video
    function getActiveVideo() {
        // Helper function to check if video is visible and playing
        const isVideoValid = (v) => {
          return v && 
                 v.offsetWidth > 0 && 
                 v.offsetHeight > 0 && 
                 !v.ended &&
                 v.readyState > 2; // HAVE_CURRENT_DATA
        };
        // First check for videos in the main document
        const mainVideos = Array.from(document.querySelectorAll("video")).filter(isVideoValid);
        if (mainVideos.length > 0) return mainVideos[0];
  
        // Check for videos in shadow DOM
        const shadowHosts = document.querySelectorAll('*');
        for (const host of shadowHosts) {
          if (host.shadowRoot) {
            const shadowVideos = Array.from(host.shadowRoot.querySelectorAll('video')).filter(isVideoValid);
            if (shadowVideos.length > 0) return shadowVideos[0];
          }
        }
        // Check iframes
        const iframes = Array.from(document.querySelectorAll("iframe"));
        for (let i = 0; i < iframes.length; i++) {
            try {
              const iframe = iframes[i];
              const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
              const iframeVideos = Array.from(iframeDoc.querySelectorAll("video")).filter(v => {
                return v.offsetWidth > 0 && v.offsetHeight > 0;
              });
              if (iframeVideos.length > 0) return iframeVideos[0];
            } catch (e) {
              console.log('Failed to access iframe:', e);
              continue;
            }
        }
        // If still not found, try Netflix-specific player
        const netflixPlayer = document.querySelector('.VideoContainer video, .watch-video video');
        if (isVideoValid(netflixPlayer)) return netflixPlayer;
        
        return null;
      }
    
    // Toggle Picture-in-Picture mode for active video
    async function togglePiP() {
      const video = getActiveVideo();
      if (!video) {
        console.error("No active video found.");
        return;
      }
      await requestPiP(video);
    }
  
    // Cycle through playback speeds for all visible videos
    function cycleSpeed() {
      const video = getActiveVideo();
      if (!video) {
        console.error("No active video found for speed change.");
        return;
      }
      currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
      video.playbackRate = speeds[currentSpeedIndex];
      const speedButton = document.getElementById("speed-button");
      if (speedButton) {
        speedButton.innerText = "Speed: " + speeds[currentSpeedIndex] + "x";
      }
    }
  
    // Listen for custom events from background commands
    window.addEventListener("chrome-extension-command", (e) => {
      if (e.detail === "toggle-pip") {
        togglePiP();
      } else if (e.detail === "cycle-speed") {
        cycleSpeed();
      }
    });
  
    // Monitor for dynamically added video elements
    const observer = new MutationObserver((mutations) => {
      for (let mutation of mutations) {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1 && node.tagName === "VIDEO") {
              console.log("New video element detected.");
              // Optionally, update UI or attach additional event listeners here
            }
            // Also check if video is inside added node
            if (node.nodeType === 1) {
              const videos = node.querySelectorAll("video");
              if (videos.length) {
                console.log("New video elements detected inside a node.");
              }
            }
          });
        }
      }
    });
  
    observer.observe(document.body, { childList: true, subtree: true });
  
    // Initialize our control panel when the DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", createControlPanel);
    } else {
      createControlPanel();
    }
  
    async function requestPiP(video) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (video && !video.disablePictureInPicture) {
          await video.requestPictureInPicture();
        }
      } catch (error) {
        console.log('PiP request failed:', error);
        // Try alternative method for YouTube
        const pipButton = document.querySelector('.ytp-miniplayer-button');
        if (pipButton) {
          pipButton.click();
        }
      }
    }

    // Cleanup when PiP is closed
    document.addEventListener('leavepictureinpicture', (event) => {
      if (window.netflixSubtitleObserver) {
        window.netflixSubtitleObserver.disconnect();
        window.netflixSubtitleObserver = null;
      }
      if (window.netflixCleanupInterval) {
        clearInterval(window.netflixCleanupInterval);
        window.netflixCleanupInterval = null;
      }
    });
  })();
  