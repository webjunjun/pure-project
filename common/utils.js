const Utils = {
  /**
   * @function 生成UUID
   * @return {string} 生成的唯一uuid
   */
  generateUUID: () => {
    if (typeof crypto === 'object') {
      if (typeof crypto.randomUUID === 'function') {
        // https://developer.mozilla.org/zh-CN/docs/Web/API/Crypto/randomUUID
        return crypto.randomUUID()
      }
      // https://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid
      if (typeof crypto.getRandomValues === 'function' && typeof Uint8Array === 'function') {
        return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => {
          const num = Number(c)
          return (num ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (num / 4)))).toString(16)
        })
      }
    }
    let timestamp = new Date().getTime()
    let perforNow = (typeof performance !== 'undefined' && performance.now && performance.now() * 1000) || 0
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      let random = Math.random() * 16
      if (timestamp > 0) {
        random = (timestamp + random) % 16 | 0
        timestamp = Math.floor(timestamp / 16)
      } else {
        random = (perforNow + random) % 16 | 0
        perforNow = Math.floor(perforNow / 16)
      }
      return (c === 'x' ? random : (random & 0x3) | 0x8).toString(16)
    })
  },

  /**
   * @function 校验密码
   * @param {string} password - 待校验的密码 必须传入
   * @param {Array<string>} forbiddenTxtArr - 禁止使用的英文 可选 默认是[]
   * @return {object<{ message: string, sucess: boolean }>} 是否通过校验
   */
  checkPassword(password, forbiddenTxtArr = []) {
    const currentPwd = password
    const regUppercase = /[A-Z]/
    const regLowercase = /[a-z]/
    const regNumber = /[0-9]/
    const regSpecial = /[_\W]/
    // 禁止abab类型 如1212
    const forbidAbab = /([a-zA-Z0-9])((?!\1)[a-zA-Z0-9])(?!\2)\1\2/g
    // 禁止aaa类型 如111
    const forbidAaa = /(\w)*(\w)\2{2}(\w)*/g
    // 禁止abc类型 如123
    const forbidAbc = (str) => {
      var arr = str.split('')
      var flag = true
      for (var i = 1; i < arr.length-1; i++) {
        var firstIndex = arr[i-1].charCodeAt()
        var secondIndex = arr[i].charCodeAt()
        var thirdIndex = arr[i+1].charCodeAt()
        thirdIndex - secondIndex == 1
        secondIndex - firstIndex==1
        if((thirdIndex - secondIndex == 1)&&(secondIndex - firstIndex==1)){
          flag =  false
        }
      }
      return flag
    }
    if (!regUppercase.test(currentPwd)) {
      return {
        message: '至少包含1位大写字母',
        sucess: false
      }
    }
    if (!regLowercase.test(currentPwd)) {
      return {
        message: '至少包含1位小写字母',
        sucess: false
      }
    }
    if (!regNumber.test(currentPwd)) {
      return {
        message: '至少包含1位数字',
        sucess: false
      }
    }
    if (!regSpecial.test(currentPwd)) {
      return {
        message: '至少包含1位特殊字符',
        sucess: false
      }
    }
    if (currentPwd.length < 8 || currentPwd.length > 20) {
      return {
        message: '长度限制8-20个字符',
        sucess: false
      }
    }
    if (forbidAbab.test(currentPwd)) {
      return {
        message: '不能包含2位及以上连续重复型字母或数字',
        sucess: false
      }
    }
    if (forbidAaa.test(currentPwd)) {
      return {
        message: '不允许连续3个字符相同',
        sucess: false
      }
    }
    if (!forbidAbc(currentPwd)) {
      return {
        message: '不能包含大于或等于3个或以上的连续相邻字母或数字',
        sucess: false
      }
    }
    if (forbiddenTxtArr.length > 0) {
      const forbiddenTxtUpperCaseArr = forbiddenTxtArr.map(item => item.toUpperCase())
      const currentUpperCasePwd = currentPwd.toUpperCase()
      const findIdx = forbiddenTxtUpperCaseArr.findIndex(item => currentUpperCasePwd.indexOf(item) !== -1)
      if (findIdx !== -1) {
        return {
          message: `不能包含${forbiddenTxtArr.join('、')}及其变体`,
          sucess: false
        }
      }
    }
    return {
      message: '成功',
      sucess: true
    }
  },

  /**
   * @function 根据叶子节点的ID查找所有的父节点的ID
   * @param {string | number} targetId - 叶子节点ID
   * @param {Array} list - 用于查找的tree数据
   * @param {Array<string | number>} result - 匹配到的父节点 
   * @returns 
   */
  findParentNodesId(targetId, list = [], result = []) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === targetId) {
        return [...result, list[i].id]
      }
      if (list[i].children && list[i].children.length > 0) {
        const findVal = Utils.findParentNodesId(targetId, list[i].children, [...result, list[i].id])
        if (findVal) {
          return findVal
        }
      }
    }
    // 没有找到目标子节点
    return null
  },

  /**
   * @function 生成从左至右的波动路径坐标数组
   * @param {number} totalWidth - 路径总长度（X轴从0到totalWidth）
   * @param {object} options - 波动参数
   * @param {number} options.amplitude - 振幅（默认80）
   * @param {number} options.wavelength - 波长（默认150）
   * @param {number} options.centerY - 波动中心Y轴（默认150）
   * @param {number} options.step - X轴步长（越小路径越平滑，默认2）
   * @returns {Array<{x: number, y: number}>} 波动路径坐标数组
   */
  generateWavePath(totalWidth, options = {}) {
    // 默认参数
    const {
      amplitude = 80,
      wavelength = 150,
      centerY = 150,
      step = 1  // X轴每步递增的距离（步长越小，坐标点越密集，路径越平滑）
    } = options;

    const wave = new Path2D();
    const path = [];
    // 从X=0到X=totalWidth，逐点计算Y坐标
    for (let x = 0; x <= totalWidth; x += step) {
      // 正弦函数计算波动Y值
      const y = amplitude * Math.sin( (2 * Math.PI * x) / wavelength ) + centerY;
      if (x === 0) {
        wave.moveTo(x - totalWidth/2, y); // 居中绘制
        // wave.moveTo(x, y);
      } else {
        wave.lineTo(x - totalWidth/2, y);
        // wave.lineTo(x, y);
      }
      // console.log(x - totalWidth/2, y);
      path.push({ x, y: Math.round(y) }); // 四舍五入Y值，避免小数坐标
    }
    return {
      path,
      wave
    };
  },

  /**
   * @function 防抖
   * 返回一个包装后的函数，这样谁在调用 Utils.debounce(fn, t) 包装过的函数时，可以通过共享的时间变量，只执行最后一次的
   * @param {Function} fn - 需要防抖的处理函数
   * @param {number} delay - 延时时间，单位：毫秒（ms）
   * @param {boolean} immediate - 是否立即执行（默认：false，延时执行）
   * @return {Function} 包装后的防抖函数（包含 cancel 方法用于取消防抖）
   */
  debounce(fn, delay, immediate = false) {
    let timer = null
    const debounceFuc = function(...args) {
      clearTimeout(timer);
    }
    return debounceFuc
  },

  /**
   * @function 节流
   * 完善版节流函数（立即执行 + 延迟收尾）
   * 返回一个包装后的函数，这样谁在调用 Utils.throttle(fn, t) 包装过的函数时，可以通过共享的时间变量，在固定时间间隔里执行一次
   * @param {Function} fn - 要节流的目标函数
   * @param {number} delay - 流间隔时间，单位：毫秒（ms）
   * @return {Function} 包装后的节流函数
   */
  throttle(fn, delay) {
    // 
    return function(...args) {
      // 
    }
  }
}

export default Utils
