<template>
  <div class="main">
    <div class="cropper">
      <div class="imgContainer">
        <img :src="this.avatarImg" alt ref="image" />
      </div>
      <div class="imgContainer2">
        <img :src="afterImg" alt="" />
      </div>
    </div>
    <div>
      <div class="before"></div>

      <el-button type="primary" @click="toUpload">上传</el-button>
      <el-button type="primary" @click="saveImg">保存</el-button>
      <el-button type="primary" @click="rotate">普通旋转</el-button>
      <el-button type="primary" @click="rotateTo">固定旋转</el-button>
      <el-button type="primary" @click="zoom(0)">缩小</el-button>
      <el-button type="primary" @click="zoom(1)">放大</el-button>
      <input
        type="file"
        accept="image/*"
        @change="handleFile"
        style="display: none"
        ref="file"
      />
    </div>
  </div>
</template>

<script>
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";
export default {
  name: "cropper",
  data() {
    return {
      myCropper: "",
      avatarImg: "",
      afterImg: "",
      minus: -0.1,
      plus: 0.1,
      degree: 5,
      staticDegree: 45
    };
  },
  mounted() {
    this.cropperInit();
  },
  methods: {
    // cropper 初始化
    cropperInit() {
      this.myCropper = new Cropper(this.$refs.image, {
        // new Cropper 的参数是 被裁剪对象和配置参数，返回一个cropper对象，拥有属性和方法
        viewMode: 1,  // 视图控制,0 无限制  1 限制裁剪框不能超出图片的范围
        dragMode: "move", // 图片是否可拖动,crop 形成新的裁剪框, move 图片可移动
        initialAspectRatio: 1, // 裁剪框宽高比的初始值 默认与图片宽高比相同 只有在aspectRatio没有设置的情况下可用
        aspectRatio: 1,  // 设置裁剪框为固定的宽高比
        preview: ".before", // 是否可预览，内容为预览承载容器的类名
        background: false, // 是否在容器内显示网格状的背景 默认true
        autoCropArea: 0.6,  //设置裁剪区域占图片的大小 值为 0-1 默认 0.8 表示 80%的区域
        zoomOnWheel: true, // 是否通过鼠标滚轮控制缩放
        rotatable: true, // 是否可旋转
      });
    },
    // 本地上传图片按钮调用
    toUpload() {
      this.$refs.file.click();
    },
    // 访问本地文件夹
    handleFile(e) {
      let $target = e.target || e.srcElement; // ie下支持e.srcElement，ff支持e.target。
      let file = $target.files[0]; // 有时候手机会上传多张图片，pc端只能选一张
      let reader = new FileReader();
      reader.onload = (data) => {
        // 图片加载完成后
        let res = data.target || data.srcElement;
        console.log(res);
        this.avatarImg = res.result;
        this.myCropper.replace(res.result, false); // 默认false, 适应高度，不失真 ,替换裁剪框的图片路径为本地上传的图片路径
      };
      reader.readAsDataURL(file);
    },
    // 保存截图
    saveImg() {
      this.afterImg = this.myCropper
        .getCroppedCanvas({
          imageSmoothingQuality: "high",
        })
        .toDataURL("image/jpeg");
    },
    rotate(){
      this.myCropper.rotate(this.degree)
    },
    rotateTo(){
      this.staticDegree += this.staticDegree
      if(this.staticDegree === 360) this.staticDegree = 45
      this.myCropper.rotateTo(this.staticDegree)
    },
    zoom(index){
      switch (index) {
        case 0: 
          this.minus = this.minus - 0.05
          this.myCropper.zoom(this.minus)
          break;
        default:
          this.plus = this.plus + 0.05
          this.myCropper.zoom(this.plus)
          break;
      }
    }
  },
};
</script>

<style scoped>
.cropper {
  width: 900px;
  height: 300px;
  margin: 50px auto;
  background: #eee;
  display: flex;
  align-items: center;
  justify-content: space-around;
}
.imgContainer {
  width: 400px;
  display: inline-block;
  background: url("../assets/bg.png") repeat;
}
.imgContainer2 {
  width: 400px;
  height: 98%;
  display: inline-block;
  background: #fff;
}
.imgContainer2 img{
  width: 200px;
  height: 200px;
  object-fit: cover;
  margin: 50px auto;
}
.imgContainer img {
  width: 250px;
  height: 250px;
  object-fit: cover;
}
.before {
  width: 100px;
  height: 100px;
  display: inline-block;
  background: url("../assets/bg.png") repeat;
  overflow: hidden;
  border-radius: 50%;
  margin-left: 50px;
  position: absolute;
  top: 370px;
  left: 305px;
}
.afterCropper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin-left: 20px;
}
</style>
