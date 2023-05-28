var AgoraE2EUtils = (function () {

    var startEncodedTransform = true;
    const worker = new Worker('./worker.js', { name: 'E2E Encryption worker' });

    worker.onmessage = (event) => {
        AgoraE2EUtilEvents.emit("CustomData", event.data);
      };

    async function setupSender(transceiver) {
        const sender = transceiver.sender;
        if (window.RTCRtpScriptTransform) {
            sender.transform = new RTCRtpScriptTransform(worker, { operation: 'encode' });
            return;
        }

        const senderStreams = sender.createEncodedStreams();
        const { readable, writable } = senderStreams;
        worker.postMessage({
            operation: 'encode',
            readable,
            writable,
        }, [readable, writable]);
    }

    async function setupReceiver(transceiver) {
        //console.info("setupReceiver", transceiver);
        const receiver = transceiver.receiver;
        if (window.RTCRtpScriptTransform) {
            receiver.transform = new RTCRtpScriptTransform(worker, { operation: 'decode' });
            return;
        }

        const receiverStreams = receiver.createEncodedStreams();
        const { readable, writable } = receiverStreams;
        worker.postMessage({
            operation: 'decode',
            readable,
            writable,
        }, [readable, writable]);
    }

    return { // public interfaces
        setEncryptionKey: function (encryptionPassword) {
            worker.postMessage({
                operation: 'setCryptoKey',
                encryptionPassword,
              });        
        },
        setCustomData: function (customData) {
            worker.postMessage({
                operation: 'setCustomData',
                customData,
              });        
        },
        setupSender: function (transceiver) {
            setupSender(transceiver)
        },
        setupReceiver: function (transceiver) {
            setupReceiver(transceiver)
        },
    };
})();


var AgoraE2EUtilEvents = (function () {

    var events = {};
  
    function on(eventName, fn) {
      events[eventName] = events[eventName] || [];
      events[eventName].push(fn);
    }
  
    function off(eventName, fn) {
      if (events[eventName]) {
        for (var i = 0; i < events[eventName].length; i++) {
          if (events[eventName][i] === fn) {
            events[eventName].splice(i, 1);
            break;
          }
        }
      }
    }
  
    function emit(eventName, data) {
      if (events[eventName]) {
        events[eventName].forEach(function (fn) {
          fn(data);
        });
      }
    }
  
    return {
      on: on,
      off: off,
      emit: emit
    };
  
  })();