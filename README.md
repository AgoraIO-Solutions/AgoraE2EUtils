
## AgoraE2EUtils.js
This javascript module provides some useful utilities to work with the AgoraRTC 4.18 SDK onwards for providing true end-to-end encryption and appending custom data to video frames.


#### Include the javascript:

         <script src="./AgoraE2EUtils.js"></script>       

#### Set the encryption key (password)  
Set a password before joining the channel which will be used to encrypt and decrypt the streams

        AgoraE2EUtils.setEncryptionKey("**F$$!~~~zzPLPLP");                       

#### Encrypt outbound streams 
Add these callbacks to your local tracks prior to publishing them     

        localTracks.videoTrack.on("transceiver-created", AgoraE2EUtils.setupSender);      
        localTracks.audioTrack.on("transceiver-created", AgoraE2EUtils.setupSender);         

#### Decrypt outbound streams 
Add these callbacks to remote tracks before playing them      

        user.videoTrack.on("transceiver-created", AgoraE2EUtils.setupReceiver);     
        user.audioTrack.on("transceiver-created", AgoraE2EUtils.setupReceiver);     

#### Send some custom data  
This will be appended to next outbound video frame and received by all subscribers

        AgoraE2EUtils.setCustomData("FFFFF333222");     


 #### Receive custom data  
This event will be fired when custom data is received appended to a video frame    

        AgoraE2EUtilEvents.on("CustomData",         
             (data) => {$("#remote-playerlist").find(".player").find("span").text(data)}    
        );       
     



