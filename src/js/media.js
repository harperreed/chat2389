/**
 * Media manager for handling device access and media streams
 */
export default class MediaManager {
    constructor() {
        this.mediaStream = null;
        this.videoEnabled = true;
        this.audioEnabled = true;
        this.devices = {
            videoinput: [],
            audioinput: [],
            audiooutput: []
        };
        this.selectedDevices = {
            videoinput: null,
            audioinput: null,
            audiooutput: null
        };
    }
    
    /**
     * Initialize media devices
     */
    async initialize() {
        try {
            // Request permissions and get media devices
            await this.requestUserMedia();
            await this.enumerateDevices();
            
            return true;
        } catch (error) {
            console.error('Error initializing media devices:', error);
            return false;
        }
    }
    
    /**
     * Request access to user media (camera and microphone)
     */
    async requestUserMedia(constraints = null) {
        try {
            let mediaConstraints = constraints;
            if (!mediaConstraints) {
                mediaConstraints = {
                    audio: this.selectedDevices.audioinput ? { deviceId: { exact: this.selectedDevices.audioinput } } : true,
                    video: this.selectedDevices.videoinput ? { deviceId: { exact: this.selectedDevices.videoinput } } : true
                };
            }
            
            // Try to get both video and audio
            try {
                console.debug('Requesting camera and microphone access...');
                this.mediaStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
                this.videoEnabled = true;
                this.audioEnabled = true;
                return this.mediaStream;
            } catch (err) {
                console.warn('Could not get both video and audio, trying video only...');
                
                // If that fails, try video only
                try {
                    this.mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: mediaConstraints.video,
                        audio: false
                    });
                    this.videoEnabled = true;
                    this.audioEnabled = false;
                    return this.mediaStream;
                } catch (err) {
                    console.warn('Could not get video, trying audio only...');
                    
                    // If that fails, try audio only
                    this.mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: false,
                        audio: mediaConstraints.audio
                    });
                    this.videoEnabled = false;
                    this.audioEnabled = true;
                    return this.mediaStream;
                }
            }
        } catch (error) {
            console.error('Error requesting user media:', error);
            this.videoEnabled = false;
            this.audioEnabled = false;
            throw error;
        }
    }
    
    /**
     * Enumerate available media devices
     */
    async enumerateDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            // Reset device lists
            this.devices = {
                videoinput: [],
                audioinput: [],
                audiooutput: []
            };
            
            // Populate device lists
            for (const device of devices) {
                if (this.devices[device.kind]) {
                    this.devices[device.kind].push({
                        id: device.deviceId,
                        label: device.label || `${device.kind} ${this.devices[device.kind].length + 1}`
                    });
                }
            }
            
            // Set default devices if none selected
            if (!this.selectedDevices.videoinput && this.devices.videoinput.length > 0) {
                this.selectedDevices.videoinput = this.devices.videoinput[0].id;
            }
            
            if (!this.selectedDevices.audioinput && this.devices.audioinput.length > 0) {
                this.selectedDevices.audioinput = this.devices.audioinput[0].id;
            }
            
            if (!this.selectedDevices.audiooutput && this.devices.audiooutput.length > 0) {
                this.selectedDevices.audiooutput = this.devices.audiooutput[0].id;
            }
            
            return this.devices;
        } catch (error) {
            console.error('Error enumerating devices:', error);
            throw error;
        }
    }
    
    /**
     * Toggle video on/off
     */
    toggleVideo() {
        if (!this.mediaStream) return false;
        
        const videoTracks = this.mediaStream.getVideoTracks();
        if (videoTracks.length === 0) return false;
        
        this.videoEnabled = !this.videoEnabled;
        
        for (const track of videoTracks) {
            track.enabled = this.videoEnabled;
        }
        
        return this.videoEnabled;
    }
    
    /**
     * Toggle audio on/off
     */
    toggleAudio() {
        if (!this.mediaStream) return false;
        
        const audioTracks = this.mediaStream.getAudioTracks();
        if (audioTracks.length === 0) return false;
        
        this.audioEnabled = !this.audioEnabled;
        
        for (const track of audioTracks) {
            track.enabled = this.audioEnabled;
        }
        
        return this.audioEnabled;
    }
    
    /**
     * Change media devices and restart stream
     */
    async changeMediaDevices(deviceSelections) {
        // Update selected devices
        if (deviceSelections.videoinput) {
            this.selectedDevices.videoinput = deviceSelections.videoinput;
        }
        
        if (deviceSelections.audioinput) {
            this.selectedDevices.audioinput = deviceSelections.audioinput;
        }
        
        if (deviceSelections.audiooutput) {
            this.selectedDevices.audiooutput = deviceSelections.audiooutput;
        }
        
        // Stop current tracks
        if (this.mediaStream) {
            for (const track of this.mediaStream.getTracks()) {
                track.stop();
            }
        }
        
        // Create constraints from selected devices
        const constraints = {
            audio: this.selectedDevices.audioinput ? { deviceId: { exact: this.selectedDevices.audioinput } } : true,
            video: this.selectedDevices.videoinput ? { deviceId: { exact: this.selectedDevices.videoinput } } : true
        };
        
        // Request media with new constraints
        await this.requestUserMedia(constraints);
        
        // Set sink ID for audio output if supported
        if (this.selectedDevices.audiooutput && typeof HTMLMediaElement.prototype.setSinkId === 'function') {
            // Apply to any audio elements that need it
            for (const el of document.querySelectorAll('audio, video')) {
                try {
                    el.setSinkId(this.selectedDevices.audiooutput);
                } catch (error) {
                    console.warn('Error setting audio output device:', error);
                }
            }
        }
        
        return this.mediaStream;
    }
    
    /**
     * Get current media stream
     */
    getStream() {
        return this.mediaStream;
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        if (this.mediaStream) {
            for (const track of this.mediaStream.getTracks()) {
                track.stop();
            }
            this.mediaStream = null;
        }
    }
}