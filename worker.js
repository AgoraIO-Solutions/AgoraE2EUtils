// custom data append params
var watermarkText = "";
var enableCustomData = true;
var CustomDataDetector = 'AgoraCustomData';
var CustomDatLengthByteCount = 4;
var encryptionPassword = "_default_unset";
let unencrypted_header_length = 1;
let grindKey_difficulty = 10;
let initialization_vector_length = 12; // initialization_vector
var lastWatermarkText = "";
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();  

function getIntBytes(x) {
    var bytes = [];
    var i = CustomDatLengthByteCount;
    do {
        bytes[--i] = x & (255);
        x = x >> 8;
    } while (i)
    return bytes;
}

function grindKey(password, difficulty) {
    return pbkdf2(password, password + password, Math.pow(2, difficulty), 32, 'SHA-256')
}

function getIv(password) {
    const randomData = base64Encode(crypto.getRandomValues(new Uint8Array(initialization_vector_length)))
    return pbkdf2(password + randomData, new Date().getTime().toString(), 1, initialization_vector_length, 'SHA-256')
}

async function pbkdf2(message, salt, iterations, keyLen, algorithm) {
    const msgBuffer = new TextEncoder('utf-8').encode(message)
    const msgUint8Array = new Uint8Array(msgBuffer)
    const saltBuffer = new TextEncoder('utf-8').encode(salt)
    const saltUint8Array = new Uint8Array(saltBuffer)

    const key = await crypto.subtle.importKey('raw', msgUint8Array, {
        name: 'PBKDF2'
    }, false, ['deriveBits'])

    const buffer = await crypto.subtle.deriveBits({
        name: 'PBKDF2',
        salt: saltUint8Array,
        iterations: iterations,
        hash: algorithm
    }, key, keyLen * 8)

    return new Uint8Array(buffer)
}

function base64Encode(u8) {
    return btoa(String.fromCharCode.apply(null, u8))
}

async function encodeFunction(encodedFrame, controller) {
    let v=encodedFrame.data.byteLength;
    if (enableCustomData && encodedFrame instanceof RTCEncodedVideoFrame) {
        const watermark = textEncoder.encode(watermarkText);
        const frame = encodedFrame.data;
        const data = new Uint8Array(encodedFrame.data.byteLength + watermark.byteLength + CustomDatLengthByteCount + CustomDataDetector.length);
        data.set(new Uint8Array(frame), 0);
        data.set(watermark, frame.byteLength);
        var bytes = getIntBytes(watermark.byteLength);
        for (let i = 0; i < CustomDatLengthByteCount; i++) {
            data[frame.byteLength + watermark.byteLength + i] = bytes[i];
        }

        // Set magic string at the end
        const magicIndex = frame.byteLength + watermark.byteLength + CustomDatLengthByteCount;
        for (let i = 0; i < CustomDataDetector.length; i++) {
            data[magicIndex + i] = CustomDataDetector.charCodeAt(i);
        }
        watermarkText=""; // clear it as now sent
        encodedFrame.data = data.buffer;
    }
    
    const originView = new Uint8Array(encodedFrame.data);
    const payload = originView.subarray(unencrypted_header_length, originView.length);
    const hashKey = await grindKey(encryptionPassword, grindKey_difficulty);
    const key = await crypto.subtle.importKey(
        'raw',
        hashKey, {
        name: 'AES-GCM',
    },
        false,
        ['encrypt']
    )

    const initialization_vector = await getIv(encryptionPassword)
    const ciphertext = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: initialization_vector,
            tagLength: 128
        },
        key,
        payload
    );
    const encryptedView = new Uint8Array(ciphertext.byteLength + unencrypted_header_length + initialization_vector_length);
    encryptedView.set(originView.subarray(0, unencrypted_header_length));
    encryptedView.set(initialization_vector, unencrypted_header_length);
    encryptedView.set(new Uint8Array(ciphertext), unencrypted_header_length + initialization_vector_length);
    encodedFrame.data = encryptedView.buffer;
    let y=encodedFrame.data.byteLength;
  //  if (!(encodedFrame instanceof RTCEncodedVideoFrame)) {
        console.warn(v,y,y-v,"isVideo",(encodedFrame instanceof RTCEncodedVideoFrame));
//    }
    controller.enqueue(encodedFrame);
}

async function decodeFunction(encodedFrame, controller) {
    const originView = new Uint8Array(encodedFrame.data);
    const hashKey = await grindKey(encryptionPassword, 10);
    const key = await crypto.subtle.importKey(
        'raw',
        hashKey, {
        name: 'AES-GCM',
    },
        false,
        ['decrypt']
    )
    const header = originView.subarray(0, unencrypted_header_length);
    const initialization_vector = originView.subarray(unencrypted_header_length, unencrypted_header_length + initialization_vector_length);
    const payload = originView.subarray(unencrypted_header_length + initialization_vector_length, encodedFrame.data.byteLength);
    let decrypted = null;
    try {
        decrypted = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: initialization_vector,
                tagLength: 128,
            },
            key,
            payload
        );
    } catch (e) {
        console.error(e);
        return;
    }

    const decryptedView = new Uint8Array(decrypted.byteLength + unencrypted_header_length);
    decryptedView.set(header);
    decryptedView.set(new Uint8Array(decrypted), unencrypted_header_length);
    encodedFrame.data = decryptedView.buffer;
    if (enableCustomData && encodedFrame instanceof RTCEncodedVideoFrame) {
        const view = new DataView(encodedFrame.data);
        const magicData = new Uint8Array(encodedFrame.data, encodedFrame.data.byteLength - CustomDataDetector.length, CustomDataDetector.length);
        let magic = [];
        for (let i = 0; i < CustomDataDetector.length; i++) {
            magic.push(magicData[i]);
        }

        let magicString = String.fromCharCode(...magic);
        if (magicString === CustomDataDetector) {
            const watermarkLen = view.getUint32(encodedFrame.data.byteLength - (CustomDatLengthByteCount + CustomDataDetector.length), false);
            const frameSize = encodedFrame.data.byteLength - (watermarkLen + CustomDatLengthByteCount + CustomDataDetector.length);
            const watermarkBuffer = new Uint8Array(encodedFrame.data, frameSize, watermarkLen);
            const watermark = textDecoder.decode(watermarkBuffer);
            if (watermark!=lastWatermarkText) {
                lastWatermarkText=watermark;
                if (watermark) {
                     self.postMessage(watermark);
                }
            }
            // Get frame data
            const frame = new Uint8Array(frameSize);
            frame.set(new Uint8Array(encodedFrame.data).subarray(0, frameSize));
            encodedFrame.data = frame.buffer;
        }
    }
    controller.enqueue(encodedFrame);
}

function handleTransform(operation, readable, writable) {
    if (operation === 'encode') {
        const transformStream = new TransformStream({
            transform: encodeFunction,
        });
        readable
            .pipeThrough(transformStream)
            .pipeTo(writable);
    } else if (operation === 'decode') {
        const transformStream = new TransformStream({
            transform: decodeFunction,
        });
        readable
            .pipeThrough(transformStream)
            .pipeTo(writable);
    }
}

// Handler for messages, including transferable streams.
onmessage = (event) => {
    if (event.data.operation === 'encode' || event.data.operation === 'decode') {
        return handleTransform(event.data.operation, event.data.readable, event.data.writable);
    }
    else if (event.data.operation === 'setCryptoKey') {
        encryptionPassword=event.data.encryptionPassword;
    }
    else if (event.data.operation === 'setCustomData') {
        watermarkText=event.data.customData;
    }   
};

// Handler for RTCRtpScriptTransforms.
if (self.RTCTransformEvent) {
    self.onrtctransform = (event) => {
        const transformer = event.transformer;
        handleTransform(transformer.options.operation, transformer.readable, transformer.writable);
    };
}
