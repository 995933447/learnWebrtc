<template>
  <div class="hello">
    <div class="wrapper">
      <div class="content">
        <span class="peerA">呼叫方</span>
        <video src="" class="v1" controls autoplay></video>
        <p v-show="allowHangup && messageOpen">
          <el-input type="text" id="callerText" v-model="sendText" />
          <el-button type="primary" @click="sendToB">发送</el-button>
        </p>
      </div>
      <div class="content">
        <span class="peerB">被呼叫方</span>
        <video src="" class="v2" controls autoplay></video>
        <p v-show="allowHangup && messageOpen">
          <el-input type="text" id="answerText" v-model="receiveText" />
          <el-button type="primary" @click="sendToA">发送</el-button>
        </p>
      </div>
    </div>
    <div class="buttons">
      <el-button type="primary" @click="startVideo">start</el-button>
      <el-button type="primary" :disabled="!allowCall" @click="callPartner"
        >call</el-button
      >
      <el-button type="primary" :disabled="!allowHangup" @click="hangup"
        >hangup</el-button
      >
    </div>
  </div>
</template>

<script>
export default {
  name: "local",
  data() {
    return {
      peerA: null,
      peerB: null,
      channelA: null,
      channelB: null,
      offerOption: {
        // offerToReceiveAudio: 1,
        offerToReceiveVideo: 1,
      },
      allowCall: false,
      allowHangup: false,
      messageOpen: false,
      sendText: "",
      receiveText: "",
    };
  },
  mounted() {
    this.$nextTick(() => {
      this.createMedia();
    });
  },
  methods: {
    // 发送消息
    sendToB() {
      this.channelA.send(JSON.stringify({ name: this.sendText }));
      this.sendText = "";
    },
    sendToA() {
      this.channelB.send(JSON.stringify({ name: this.receiveText }));
      this.receiveText = "";
    },
    hangup() {
      this.peerA.close();
      this.peerB.close();
      this.peerA = null;
      this.peerB = null;
      this.channelA.close();
      this.channelB.close();
      this.allowCall = true;
      this.allowHangup = false;
      document.querySelector('.v2').pause()
      this.sendText = "";
      this.receiveText = "";
    },
    async startVideo() {
      let video = document.querySelector(".v1");
      video.srcObject = this.localstream;
      this.allowCall = true;
      await this.initPeer();
    },
    async callPartner() {
      // 开始呼叫对方，需要交换一下本地媒体描述信息(SDP信息)
      if (!this.peerA || !this.peerB) {
        // 判断是否有对应实例，没有就重新创建
        this.initPeer();
      }
      try {
        let offer = await this.peerA.createOffer(this.offerOption); // A创建 offer
        await this.onCreateOffer(offer);
      } catch (e) {
        // console.log("createOffer: ", e);
      }

      this.allowCall = false;
      this.allowHangup = true;
    },
    async onCreateOffer(desc) {
      try {
        await this.peerA.setLocalDescription(desc); // 呼叫端设置本地 offer 描述
      } catch (e) {
        // console.log("Offer-setLocalDescription: ", e);
      }
      try {
        await this.peerB.setRemoteDescription(desc); // 接收端设置远程 offer 描述
      } catch (e) {
        // console.log("Offer-setRemoteDescription: ", e);
      }
      try {
        let answer = await this.peerB.createAnswer(); // 接收端创建 answer
        await this.onCreateAnswer(answer);
      } catch (e) {
        // console.log("createAnswer: ", e);
      }
    },
    async onCreateAnswer(desc) {
      try {
        await this.peerB.setLocalDescription(desc); // 接收端设置本地 answer 描述
      } catch (e) {
        // console.log("answer-setLocalDescription: ", e);
      }
      try {
        await this.peerA.setRemoteDescription(desc); // 呼叫端设置远程 answer 描述
      } catch (e) {
        // console.log("answer-setRemoteDescription: ", e);
      }
    },
    initPeer() {
      // 初始化的作用：每个端都要创建一个rtcpeerConnection对象，互相交换 ICE 信息,双方才能通信
      // 创建呼叫端 PeerConnection
      let PeerConnection =
        window.RTCPeerConnection ||
        window.mozRTCPeerConnection ||
        window.webkitRTCPeerConnection;
      this.peerA = new PeerConnection();
      this.peerA.addStream(this.localstream);
      // 监听 A 的ICE候选信息
      // 如果收集到，就添加给 B
      this.peerA.onicecandidate = (event) => {
        // console.log(event);
        if (event.candidate) {
          // console.log("peerA:", event);
          this.peerB.addIceCandidate(event.candidate); // 接收端收到A的ICE信息
        }
      };
      //创建一个data channel 数据通道，便于双方信息的传输：文件，文字，图片等
      this.channelA = this.peerA.createDataChannel("messagechannel"); // messagechannel是指通道名称，还可以带一个options对象做参数
      console.log(this.channelA);
      this.channelA.onopen = (event) => {
        console.log("channelA onopen", event);
        this.messageOpen = true;
      };
      this.channelA.onclose = function (event) {
        console.log("channelA onclose", event);
      };
      this.channelA.onmessage = (e) => {
        this.sendText = JSON.parse(e.data).name;
        console.log("channelA onmessage", e.data);
      };
      // 创建输出端
      this.peerB = new PeerConnection();
      this.peerB.onaddstream = (event) => {
        // 监听是否有媒体流接入，如果有就赋值给 v2 的 src
        console.log("event-stream", event);
        let video = document.querySelector(".v2");
        video.srcObject = event.stream;
      };
      // 监听 B 的ICE候选信息
      // 如果收集到，就添加给 A
      this.peerB.onicecandidate = (event) => {
        // console.log("peerB:", event);
        if (event.candidate) {
          this.peerA.addIceCandidate(event.candidate); // 呼叫方收到B的ICE 信息，两方进行连通性检测，检测完及连接成功
        }
      };
      // 双方传输信息的流程是： 呼叫端要建立dataChannel,保持打开状态，接收端要监听dataChannel,保持message接收状态
      // this.channelB = this.peerB.createDataChannel("messagechannel");
      this.peerB.ondatachannel = (event) => {
        console.log(event);
        this.channelB = event.channel;
        this.channelB.binaryType = "arraybuffer";
        this.channelB.onopen = (e) => {
          console.log("channelB onopen", e);
        };
        this.channelB.onclose = (e) => {
          console.log("channelB onclose", e);
        };
        this.channelB.onmessage = (e) => {
          this.receiveText = JSON.parse(e.data).name;
          console.log("channelB onmessage", e.data);
        };
      };
      // 监听peerB的ICE连接状态
      this.peerB.oniceconnectionstatechange = (evt) => {
        console.log(
          "ICE connection state change: " + evt.target.iceConnectionState
        );
        // 其中completed 和 disconnected，一个是完成连接时触发，一个在断开连接时触发
      };
    },
    gotLocalMediaStream(mediaStream) {
      // console.log(mediaStream);
      this.localstream = mediaStream;
    },
    handleLocalMediaStreamError(error) {
      // chrome 版本太旧需要更新成最新，79是不行的，86的可以，edge也可以调起来摄像头，也有可能是因为电脑设置里没有允许相机或者麦克风开启的权限
      console.log("navigator.getUserMedia error: ", error);
    },

    createMedia() {
      const mediaStreamContrains = {
        audio: true,
        video: true,
      };
      // 保存本地流到全局
      navigator.mediaDevices
        .getUserMedia(mediaStreamContrains)
        .then(this.gotLocalMediaStream)
        .catch(this.handleLocalMediaStreamError);
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.hello {
  width: 900px;
  height: 600px;
  margin: 0 auto;
}
.v1,
.v2 {
  width: 400px;
  height: 250px;
  margin: 0;
  margin-top: 10px;
  padding: 0;
}
.wrapper {
  position: relative;
  width: 100%;
  display: flex;
}
.content {
  display: inline-block;
  display: flex;
  flex-direction: column;
  margin: 0 10px;
}
.buttons {
  text-align: left;
  margin-top: 25px;
  padding-left: 95px;
}
.el-input {
  width: 400px !important;
  margin: 10px 0;
}
</style>
