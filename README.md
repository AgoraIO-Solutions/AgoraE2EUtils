
## AgoraE2EUtils.js
This javascript module provides some useful utilities to work with the AgoraRTC 4.20 SDK onwards for providing true end-to-end encryption and appending custom data to video frames.


#### Include the javascript:

         <script src="./AgoraE2EUtils.js"></script>       

#### Set the encryption key (password)  
Set a password before joining the channel which will be used to encrypt and decrypt the streams

        AgoraE2EUtils.setEncryptionKey("**F$$!~~~zzPLPLP");                       

#### Encrypt outbound streams 
Add these callbacks to your local tracks prior to publishing them     

        localTracks.videoTrack.on("transceiver-updated", AgoraE2EUtils.setupSender);         
        if (localTracks.videoTrack.getRTCRtpTransceiver()) {    
            AgoraE2EUtils.setupSender(localTracks.videoTrack.getRTCRtpTransceiver());     
        }    
        
        localTracks.audioTrack.on("transceiver-updated", AgoraE2EUtils.setupSender);           
        if (localTracks.audioTrack.getRTCRtpTransceiver()) {     
            AgoraE2EUtils.setupSender(localTracks.audioTrack.getRTCRtpTransceiver());      
        }      
 
#### Decrypt inbound streams 
Add these callbacks to remote tracks before playing them      

        user.audioTrack.on("transceiver-updated", AgoraE2EUtils.setupReceiver);    
        if (user.audioTrack.getRTCRtpTransceiver()) {      
                AgoraE2EUtils.setupReceiver(user.audioTrack.getRTCRtpTransceiver());      
        }      

        user.videoTrack.on("transceiver-updated", AgoraE2EUtils.setupReceiver);
        if (user.videoTrack.getRTCRtpTransceiver()) {
        AgoraE2EUtils.setupReceiver(user.videoTrack.getRTCRtpTransceiver());
        }        

#### Send some custom data  
This will be appended to next outbound video frame and received by all subscribers

        AgoraE2EUtils.setCustomData("FFFFF333222");     


#### Receive custom data  
This event will be fired when custom data is received appended to a video frame    

        AgoraE2EUtilEvents.on("CustomData",         
             (data) => {$("#remote-playerlist").find(".player").find("span").text(data)}    
        );       
     
     
### Demo Video    
https://drive.google.com/file/d/1rjIO3x5OuIX7Is4LQuQYGLrCxfAGdra8/view?usp=sharing



