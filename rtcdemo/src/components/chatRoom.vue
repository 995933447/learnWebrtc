<template>
  <div class="room">
    <div class="can-support-rtc" v-if="canSupportVideo">
      <div class="form-area" v-if="showFormArea">
        <h1>1 vs 1</h1>
        <el-form
          :model="ruleForm"
          :rules="rules"
          ref="ruleForm"
          label-width="100px"
          class="demo-ruleForm"
        >
          <el-form-item label="房间Id" prop="roomId">
            <el-input v-model="ruleForm.roomId"></el-input>
          </el-form-item>
          <el-form-item label="用户名称" prop="userName">
            <el-input v-model="ruleForm.userName"></el-input>
          </el-form-item>
        </el-form>
        <div class="section">
          <el-button
            type="primary"
            @click="joinRoom('ruleForm')"
            :disabled="!canClickBtn"
            >加入房间</el-button
          >
          <el-button @click="resetForm">重置</el-button>
        </div>
      </div>
      <div class="list-area" v-if="!showFormArea">
        <h2>当前房间id: {{ ruleForm.roomId }}</h2>
        <h2>在线人数: {{ roomUsers.length }}</h2>
        <el-table :data="roomUsers" stripe style="width: 362px" :border="true">
          <el-table-column
            prop="userName"
            label="名称"
            width="180"
            align="center"
          >
          </el-table-column>
          <el-table-column
            prop="sockId"
            label="sockId"
            width="180"
            align="center"
          >
          </el-table-column>
        </el-table>
        <el-button
          type="primary"
          v-if="roomUsers.length > 1 && sockId"
          @click="toSendVideo"
        >
          发起视频
        </el-button>
        <div class="area" v-if="isUserCommentArea">
          <div
            class="wrapper"
            v-if="roomUsers.length > 1"
            ref="wrapper"
            draggable="true"
          >
            <h3 class="title">{{ this.receiveUser.userName }}</h3>
            <div class="show_content" ref="userContents"></div>
          </div>
          <el-input placeholder="请输入内容" v-model="textContent"></el-input>
          <el-button type="primary" @click="sendText">发送</el-button>
        </div>
      </div>
    </div>
    <div v-else>
      <h1>当前域名的浏览器不支持WebRTC！</h1>
    </div>
  </div>
</template>

<script>
import socket from "../utils/socket.js";
export default {
  name: "",
  data() {
    const validateRoomId = (rule, value, callback) => {
      const reg = /^\d{1,5}$/;
      if (!reg.test(value)) {
        return callback(new Error("房间ID只能为1-5位的数字"));
      }
      callback();
    };
    const validateUserName = (rule, value, callback) => {
      const reg = /^[\u4e00-\u9fa5a-zA-Z-z]{1,10}$/;
      if (!reg.test(value)) {
        return callback(new Error("请输入合法的姓名"));
      }
      callback();
    };
    return {
      ruleForm: {
        roomId: "",
        userName: "",
      },
      rules: {
        //validator: validateRoomId   自定义校验规则
        roomId: [
          { required: true, message: "请输入房间Id", trigger: "blur" },
          { validator: validateRoomId, trigger: "blur" },
        ],
        userName: [
          { required: true, message: "请输入用户名称", trigger: "blur" },
          { validator: validateUserName, trigger: "blur" },
        ],
      },
      isUserCommentArea: false,
      textContent: "",
      roomUsers: [],
      sockId: "",
      canClickBtn: true,
      canSupportVideo: false,
      showFormArea: true,
      userData: [],
      localStream: "",
      peer: "",
      offerOption: {
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1,
      },
    };
  },
  computed: {
    // 发起者
    user() {
      return Object.assign({}, { sockId: this.sockId }, this.ruleForm);
    },
    // 接听者
    receiveUser() {
      // 查找同个房间内不同sockId的那个就是接听者
      return this.roomUsers.find((item) => item.sockId !== this.sockId);
    },
  },
  mounted() {
    if (this.canSupportWebRTC()) {
      this.initVIDEO_VIEWSdk();
      this.initSocketEvents();
      console.log(socket);
    }
  },
  methods: {
    // webrtc兼容性判断
    canSupportWebRTC() {
      if (typeof navigator.mediaDevices !== "object") {
        this.$message.error("No navigator.mediaDevices");
        return false;
      }
      if (typeof navigator.mediaDevices.enumerateDevices !== "function") {
        this.$message.error("No navigator.mediaDevices.enumerateDevices");
        return false;
      }
      if (typeof navigator.mediaDevices.getUserMedia !== "function") {
        this.$message.error("No navigator.mediaDevices.getUserMedia");
        return false;
      }
      this.canSupportVideo = true;
      this.getDevices();
      return true;
    },
    // 音视频检测
    async getDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        VIDEO_VIEW.showDevicesNameByDevices(devices);
      } catch (error) {
        console.error(error);
        const msg = `getDevices error: ${error.name} : ${error.message}`;
        this.$message.error(msg);
      }
    },
    //初始化所有socket事件
    initSocketEvents() {
      // 连接成功
      socket.on("connectionSuccess", (data) => {
        this.sockId = data;
      });
      // 检测房间成功
      socket.on("checkRoomSuccess", (exsitRoomUsers) => {
        console.log(exsitRoomUsers);
        if (exsitRoomUsers && exsitRoomUsers.length > 1) {
          this.$message.info("当前房间人数已满~请换个房间id");
          this.canClickBtn = true;
        } else {
          this.showFormArea = false;
          this.roomUsers = [
            {
              userName: this.ruleForm.userName + "(我)",
              sockId: this.sockId,
              roomId: this.ruleForm.roomId,
            },
          ];
          console.log(this.roomUsers);
        }
      });
      // 加入房间成功
      socket.on("joinRoomSuccess", (roomUsers) => {
        console.log("joinRoomSuccess client user:", roomUsers);
        const otherUser = roomUsers.find((item) => item.sockId !== this.sockId);
        if (!otherUser) return false;
        this.$message.success(`${otherUser.userName}加入了房间`);
        this.roomUsers = [
          otherUser,
          {
            userName: this.ruleForm.userName + "(我)",
            sockId: this.sockId,
            roomId: this.ruleForm.roomId,
          },
        ];
      });
      // 接收视频邀请
      socket.on("receiveVideo", (sender) => {
        if (this.user.sockId === sender.sockId) return false;
        VIDEO_VIEW.showReceiveVideoModalBySender(sender);
      });
      // 取消发送视频
      socket.on("cancelSendVideo", (user) => {
        const tips =
          user.sockId === this.sockId
            ? "您取消了发送视频"
            : "对方取消了发送视频";
        this.$message.info(tips);
        VIDEO_VIEW.hideAllVideoModal();
      });
      //拒绝接收视频
      socket.on("rejectReceiveVideo", (user) => {
        const tips =
          this.sockId === suer.sockId
            ? "已为您拒绝了视频邀请"
            : "对方拒绝接受视频邀请";
        this.$message.info(tips);
        VIDEO_VIEW.hideAllVideoModal();
      });
      // 接听视频
      socket.on("answerVideo", async (user) => {
        console.log("接收了视频");
        this.isUserCommentArea = true;
        VIDEO_VIEW.showInvideoModal();
        // 创建本地视频流信息
        const localStream = await this.createLocalVideoStream();
        this.localStream = localStream;
        document.querySelector("#echat-local").srcObject = this.localStream; // echat-local是sdk内部的
        let PeerConnection =
          window.RTCPeerConnection ||
          window.mozRTCPeerConnection ||
          window.webkitRTCPeerConnection;
        this.peer = new PeerConnection();
        console.log("rtcPeerCOnnection对象:", this.peer);
        this.initRtcPeerConnection();
        this.peer.addStream(this.localStream); // 添加本地音视频流
        if (user.sockId === this.sockId) {
          // 接收方
        } else {
          // 发送方 创建offer
          const offer = await this.peer.createOffer(this.offerOption);
          console.log("呼叫方设置的SDP称为offer: ", offer);
          console.log("offer SDP:", offer.sdp);
          await this.peer.setLocalDescription(offer);
          socket.emit("receiveOffer", { user: this.user, offer });
        }
      });
      //挂断视频
      socket.on("hangupVideo", async (user) => {
        const tips =
          user.sockId === this.sockId ? "您挂断了视频" : "对方挂断了视频";
        this.$message.info(tips);
        this.peer.close();
        this.peer = null;
        VIDEO_VIEW.hideAllVideoModal();
        document.querySelector("#echat-remote-1").srcObject = null;
        document.querySelector("#echat-local").srcObject = null;
      });
      //添加对方的ICE
      socket.on("addIceCandidate", async (candidate) => {
        console.log(this.user.userName, ': ',candidate)
        await this.peer.addIceCandidate(candidate);
      });
      // 如自己是接收方，则先设置remoteDescription，再创建answer描述，设置localDescription
      socket.on("receiveOffer", async (offer) => {
        await this.peer.setRemoteDescription(offer);
        const answer = await this.peer.createAnswer();
        console.log("接收方设置的SDP称为answer: ", answer);
        console.log("answer SDP:", answer.sdp);
        await this.peer.setLocalDescription(answer);
        socket.emit("receiveAnswer", { answer, user: this.user }); // 通知对方接收媒体描述
      });
      // 如自己是发送方，只需设置remoteDescription
      socket.on("receiveAnswer", (answer) => {
        this.peer.setRemoteDescription(answer);
      });
      socket.on("sendText", async (user, content) => {
        console.log(user, content);
        if (user.sockId === this.sockId) {
          let div = document.createElement("div");
          div.style.margin = "10px 5px 10px 0";
          div.style.height = "45px";
          div.style.maxHeight = "150px";
          let p1 = document.createElement("p");
          p1.innerHTML = content;
          p1.style.maxWidth = "150px";
          p1.style.background = "lightgreen";
          p1.style.float = "right";
          p1.style.padding = "7px";
          p1.style.borderRadius = "5px";
          div.appendChild(p1);
          this.$refs.userContents.appendChild(div);
        } else {
          let div = document.createElement("div");
          div.style.margin = "10px 0 10px 5px";
          div.style.height = "45px";
          div.style.maxHeight = "150px";
          let p2 = document.createElement("p");
          p2.innerHTML = content;
          p2.style.maxWidth = "150px";
          p2.style.background = "#eee";
          p2.style.padding = "7px";
          p2.style.borderRadius = "5px";
          p2.style.float = "left";
          div.appendChild(p2);
          this.$refs.userContents.appendChild(div);
        }
      });
    },
    //初始化video-view SDK
    initVIDEO_VIEWSdk() {
      const configOptios = {
        startVideoCancelCb: this.startVideoCancelCb,
        receiveVideoCancelCb: this.receiveVideoCancelCb,
        receiveVideoAnswerCb: this.receiveVideoAnswerCb,
        hangUpVideoCb: this.hangUpVideoCb,
        openMikeCb: this.openMikeCb,
        closeMikeCb: this.closeMikeCb,
        openCammerCb: this.openCammerCb,
        closeCammerCb: this.closeCammerCb,
        toScreenCb: this.toScreenCb,
      };
      VIDEO_VIEW.configCallBack(configOptios);
    },
    // 关闭整个视频
    startVideoCancelCb() {
      socket.emit("cancelSendVideo", this.user);
      VIDEO_VIEW.hideAllVideoModal();
    },
    // 拒绝视频邀请
    receiveVideoCancelCb() {
      socket.emit("rejectReceiveVideo", this.user);
      VIDEO_VIEW.hideAllVideoModal();
    },
    // 接收视频邀请
    receiveVideoAnswerCb() {
      socket.emit("answerVideo", this.user); // 用户点击接听视频
      this.isUserCommentArea = true;
      console.log("用户点击接听视频");
    },
    // 挂断
    hangUpVideoCb() {
      socket.emit("hangupVideo", this.user);
    },
    openMikeCb() {},
    closeMikeCb() {},
    openCammerCb() {},
    closeCammerCb() {},
    toScreenCb() {},
    // 加入房间
    joinRoom(formName) {
      if (!this.sockId) {
        this.$message.error("socket未连接成功,请刷新再尝试!");
        window.location.reload();
        return false;
      }
      this.$refs[formName].validate((valid) => {
        console.log(valid);
        if (valid) {
          // 检查房间人数
          // alert("submit!");
          this.canClickBtn = false;
          socket.emit("checkRoom", {
            roomId: this.ruleForm.roomId,
            sockId: this.sockId,
            userName: this.ruleForm.userName,
          });
        } else {
          console.log("error submit!!");
          return false;
        }
      });
      // if(this.roomId === ''){
      //   this.$message.error('请填写房间号!');
      //   return false
      // }
      // if(this.userName === ''){
      //   this.$message.error('请填写名称!');
      //   return false
      // }
      //  //如果房间不空，则发送 "create or join" 消息
      //  console.log('Joining room ' + this.roomId);
      //  socket.emit('create or join', {roomId:this.roomId,userName: this.userName,sockId:this.sockId});
    },
    // 重置参数
    resetForm() {
      this.$refs.ruleForm.resetFields(); // 对该表单项进行重置，将其值重置为初始值并移除校验结果
      this.ruleForm.roomId = "";
      this.ruleForm.userName = "";
    },
    // 发起视频
    toSendVideo() {
      console.log(this.ruleForm.userName, "发起视频");
      socket.emit("toSendVideo", this.user);
      VIDEO_VIEW.showStartVideoModalByReceiver(this.receiveUser);
    },
    // 获取本地音视频流
    async createLocalVideoStream() {
      // echoCancellation: 回音消除，noiseSuppression： 降噪，autoGainControl：自动增益
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: true,
      };
      const localStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );
      console.log("localStream:", localStream);
      return localStream;
    },
    // 初始化rtcPeerConnection对象
    initRtcPeerConnection() {
      // 监听ICE 信息
      this.peer.onicecandidate = (event) => {
        // 存在则通过socket发给房间内的另一方，该添加ICE了
        if (event.candidate) {
          socket.emit("addIceCandidate", {
            candidate: event.candidate,
            user: this.user,
          });
        }
      };
      this.peer.onaddstream = (event) => {
        // 当有视频流过来则渲染到sdk内的remote端
        document.querySelector("#echat-remote-1").srcObject = event.stream;
      };
      // 关闭
      this.peer.onclose = () => {};
    },
    sendText() {
      socket.emit("sendText", this.user, this.textContent);
      this.textContent = "";
    },
  },
};
</script>

<style scoped>
.section {
  width: 600px;
  height: 50px;
  margin: 15px auto;
  text-align: center;
}
/* .el-input{
  width: 500px;
  display: inline-block !important;
} */
h1 {
  width: 100%;
  text-align: center;
}
.el-form-item {
  width: 500px;
  margin: 25px auto;
}
.box-card {
  width: 480px;
  margin: 0 auto;
}
.list-area .box-card .item {
  padding: 18px 0;
}
.list-area .el-button--primary {
  margin-top: 25px;
}
.list-area .el-input {
  display: inline-block;
  width: 400px;
}
.el-table {
  margin: 0 auto;
}
.wrapper {
  width: 400px;
  height: 200px;
  overflow: auto;
  position: fixed;
  top: 15px;
  left: 15px;
  margin: 10px auto;
  border: 1px solid #eee;
}
.title {
  text-align: center;
  height: 55px;
  background: #eee;
  border-bottom: 1px solid #fff;
  line-height: 55px;
  margin: 0;
}
.show_content {
  background: #eee;
}
</style>
