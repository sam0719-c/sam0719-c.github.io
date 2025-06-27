import { Chart } from "@/components/ui/chart"
// 等待DOM載入完成
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 應用程序開始初始化...")

  // 註冊Chart.js的數據標籤插件
  const ChartDataLabels = window.ChartDataLabels
  if (typeof Chart !== "undefined" && typeof ChartDataLabels !== "undefined") {
    Chart.register(ChartDataLabels)
    console.log("✅ Chart.js 和 DataLabels 插件已註冊")
  } else {
    console.error("❌ Chart.js 或 ChartDataLabels 未載入")
  }

  // ===== CSV文件列表變量 =====
  let PREDEFINED_CSV_FILES = [] // 將從JSON文件載入

  // 獲取DOM元素
  const csvFileInput = document.getElementById("csvFile")
  const csvSelector = document.getElementById("csvSelector")
  const refreshCsvBtn = document.getElementById("refreshCsvBtn")
  const prevBtn = document.getElementById("prevBtn")
  const nextBtn = document.getElementById("nextBtn")
  const generationInfo = document.getElementById("generationInfo")
  const trendRatioElement = document.getElementById("trendRatio")
  const expectedReturnElement = document.getElementById("expectedReturn")
  const riskElement = document.getElementById("risk")
  const stepInfoElement = document.getElementById("step")
  const stageInfoElement = document.getElementById("stage")
  const stockRatiosContainer = document.getElementById("stockRatios")
  const bestGenerationElement = document.getElementById("bestGeneration")
  const bestTrendRatioElement = document.getElementById("bestTrendRatio")
  const bestStockRatiosContainer = document.getElementById("bestStockRatios")
  const chartCanvas = document.getElementById("stockChart")
  const playBtn = document.getElementById("playBtn")
  const playBtnText = document.getElementById("playBtnText")
  const playSpeed = document.getElementById("playSpeed")
  const toggleValueBtn = document.getElementById("toggleValueBtn")
  const chartViewBtn = document.getElementById("chartViewBtn")
  const axisViewBtn = document.getElementById("axisViewBtn")
  const customViewBtn = document.getElementById("customViewBtn")
  const chartView = document.getElementById("chartView")
  const axisView = document.getElementById("axisView")
  const customView = document.getElementById("customView")
  const currentMarker = document.getElementById("currentMarker")
  const bestMarker = document.getElementById("bestMarker")
  const statusMessage = document.getElementById("status-message")

  // 自定義比例視圖相關元素
  const customStockInputs = document.getElementById("customStockInputs")
  const calculateBtn = document.getElementById("calculateBtn")
  const resetCustomBtn = document.getElementById("resetCustomBtn")
  const customTrendRatioElement = document.getElementById("customTrendRatio")
  const customExpectedReturnElement = document.getElementById("customExpectedReturn")
  const customRiskElement = document.getElementById("customRisk")

  // 初始化變量
  let csvData = []
  let currentGeneration = 0
  let totalGenerations = 0
  let stockNames = []
  let chart = null
  let isPlaying = false
  let playInterval = null
  let playSpeedValue = 1000 // 預設播放速度（毫秒）
  let showValues = false // 預設不顯示數值

  // 跟蹤最佳TrendRatio的變量
  let bestTrendRatioGeneration = -1
  let bestTrendRatioValue = Number.NEGATIVE_INFINITY
  let bestTrendRatioStockValues = []

  // ===== 狀態消息顯示函數 =====
  function showStatusMessage(message, type = "info") {
    if (!statusMessage) return

    statusMessage.textContent = message
    statusMessage.className = `status-message ${type}`
    statusMessage.style.display = "block"

    // 3秒後自動隱藏
    setTimeout(() => {
      statusMessage.style.display = "none"
    }, 3000)
  }

  // ===== 獲取當前頁面的基礎URL =====
  function getBaseUrl() {
    // 獲取當前頁面的完整路徑
    const currentPath = window.location.pathname
    const pathParts = currentPath.split("/")

    // 如果是 GitHub Pages，通常格式為 /repository-name/
    // 我們需要保留到倒數第二個部分
    if (pathParts.length > 2 && pathParts[pathParts.length - 1] === "") {
      // 路徑以 / 結尾，移除最後的空字符串
      pathParts.pop()
    }

    // 移除文件名（如 index.html）
    if (pathParts[pathParts.length - 1].includes(".")) {
      pathParts.pop()
    }

    const basePath = pathParts.join("/") + "/"
    console.log("🔗 檢測到的基礎路徑:", basePath)
    return basePath
  }

  // ===== 從JSON文件載入CSV文件列表 =====
  async function loadCsvFilesList() {
    try {
      console.log("📡 正在載入CSV文件列表...")
      showStatusMessage("正在載入CSV文件列表...", "info")

      const baseUrl = getBaseUrl()
      const jsonUrl = baseUrl + "csv-files.json"
      console.log("📡 嘗試載入JSON文件:", jsonUrl)

      const response = await fetch(jsonUrl)

      if (!response.ok) {
        console.error(`❌ HTTP錯誤: ${response.status} ${response.statusText}`)
        throw new Error(`無法載入CSV文件列表 (HTTP ${response.status})`)
      }

      const data = await response.json()
      console.log("📄 JSON數據:", data)

      PREDEFINED_CSV_FILES = data.files || []

      // 修正文件路徑，確保使用正確的基礎URL
      PREDEFINED_CSV_FILES = PREDEFINED_CSV_FILES.map((file) => ({
        ...file,
        path: file.path.startsWith("./") ? baseUrl + file.path.substring(2) : baseUrl + file.path,
      }))

      console.log("✅ 已從JSON載入CSV文件列表:", PREDEFINED_CSV_FILES)

      if (PREDEFINED_CSV_FILES.length === 0) {
        console.warn("⚠️ JSON文件中沒有找到任何CSV文件")
        showStatusMessage("沒有找到CSV文件，請添加文件後運行Python腳本", "warning")
      } else {
        showStatusMessage(`成功載入 ${PREDEFINED_CSV_FILES.length} 個CSV文件`, "success")
      }

      return true
    } catch (error) {
      console.error("❌ 載入CSV文件列表時出錯:", error)

      // 如果載入失敗，檢查是否是因為文件不存在
      if (error.message.includes("404") || error.message.includes("Failed to fetch")) {
        console.warn("⚠️ csv-files.json 文件不存在")
        showStatusMessage("找不到csv-files.json文件！請運行Python腳本生成文件列表", "error")

        // 顯示詳細的幫助信息
        showHelpMessage()
      } else {
        showStatusMessage("載入CSV文件列表失敗: " + error.message, "error")
      }

      // 使用空的CSV文件列表
      PREDEFINED_CSV_FILES = []
      return false
    }
  }

  // ===== 顯示幫助信息 =====
  function showHelpMessage() {
    const helpMessage = document.createElement("div")
    helpMessage.style.cssText = `
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      color: #856404;
      font-family: Arial, sans-serif;
    `
    helpMessage.innerHTML = `
      <h4 style="margin-top: 0; color: #856404;">📋 設置說明</h4>
      <p><strong>請按照以下步驟設置CSV文件：</strong></p>
      <ol style="margin: 10px 0; padding-left: 20px;">
        <li>創建 <code style="background: #f8f9fa; padding: 2px 4px; border-radius: 3px;">data/</code> 文件夾</li>
        <li>將CSV文件放入 <code style="background: #f8f9fa; padding: 2px 4px; border-radius: 3px;">data/</code> 文件夾</li>
        <li>運行命令：<code style="background: #f8f9fa; padding: 2px 4px; border-radius: 3px;">python update_csv_list.py</code></li>
        <li>點擊"刷新"按鈕或重新載入頁面</li>
      </ol>
      <p><strong>或者您可以：</strong></p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>直接使用下方的"上傳CSV檔案"功能</li>
        <li>運行 <code style="background: #f8f9fa; padding: 2px 4px; border-radius: 3px;">python update_csv_list.py --help</code> 查看詳細說明</li>
      </ul>
      <button onclick="this.parentElement.remove()" style="
        background: #007bff; 
        color: white; 
        border: none; 
        padding: 8px 16px; 
        border-radius: 4px; 
        cursor: pointer;
        margin-top: 10px;
      ">知道了</button>
    `

    // 將幫助信息插入到容器頂部
    const container = document.querySelector(".container")
    const csvSelector = document.querySelector(".csv-selector")
    container.insertBefore(helpMessage, csvSelector.nextElementSibling)
  }

  // 監聽事件
  csvFileInput.addEventListener("change", handleFileUpload)
  prevBtn.addEventListener("click", showPreviousGeneration)
  nextBtn.addEventListener("click", showNextGeneration)
  playBtn.addEventListener("click", togglePlay)
  playSpeed.addEventListener("change", updatePlaySpeed)
  toggleValueBtn.addEventListener("click", toggleValueDisplay)
  chartViewBtn.addEventListener("click", () => switchView("chart"))
  axisViewBtn.addEventListener("click", () => switchView("axis"))
  customViewBtn.addEventListener("click", () => switchView("custom"))
  calculateBtn.addEventListener("click", calculateCustomRatios)
  resetCustomBtn.addEventListener("click", resetCustomInputs)
  csvSelector.addEventListener("change", handleCsvSelection)
  refreshCsvBtn.addEventListener("click", refreshCsvFilesList)

  // 監聽鍵盤事件
  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      showPreviousGeneration()
    } else if (event.key === "ArrowRight") {
      showNextGeneration()
    }
  })

  // 處理檔案上傳
  function handleFileUpload(event) {
    const file = event.target.files[0]
    if (!file) return

    console.log("📁 開始處理上傳的文件:", file.name)
    showStatusMessage("正在處理上傳的CSV文件...", "info")

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        // 清除現有數據
        csvData = []
        stockNames = []

        // 解析新數據
        parseCSV(e.target.result)

        console.log("✅ 上傳後的股票名稱:", stockNames)
        console.log("📊 上傳後的股票數量:", stockNames.length)

        if (csvData.length > 0) {
          // 從頭重建圖表
          if (chart) {
            chart.destroy()
            chart = null
          }

          // 初始化圖表
          initChart(csvData[0].stockValues)
          currentGeneration = 0
          showGeneration(currentGeneration)
          updateButtonState()

          showStatusMessage(`成功載入CSV文件，包含 ${totalGenerations} 個世代`, "success")
        } else {
          showStatusMessage("CSV文件格式不正確或沒有數據", "error")
        }
      } catch (error) {
        console.error("❌ 解析CSV文件時出錯:", error)
        showStatusMessage("解析CSV文件時出錯: " + error.message, "error")
      }
    }
    reader.readAsText(file, "UTF-8")
  }

  // 解析CSV數據
  function parseCSV(content) {
    console.log("🔍 開始解析CSV數據...")

    // 檢測分隔符（逗號或制表符）
    const delimiter = content.includes(",") ? "," : "\t"
    console.log("📝 使用分隔符:", delimiter === "," ? "逗號" : "制表符")

    // 按行分割
    const lines = content.split("\n").filter((line) => line.trim() !== "")
    console.log("📄 總行數:", lines.length)

    if (lines.length < 2) {
      throw new Error("CSV文件至少需要包含標題行和一行數據")
    }

    // 獲取標題行
    const headerLine = lines[0]
    const headers = headerLine.split(delimiter)
    console.log("📋 標題行:", headers)

    // 找到TrendRatio的索引
    const trendRatioIndex = headers.indexOf("TrendRatio")
    if (trendRatioIndex === -1) {
      throw new Error("CSV文件格式錯誤：找不到TrendRatio列")
    }

    // 直接使用所有TrendRatio前的列作為股票名稱
    stockNames = []
    for (let i = 0; i < trendRatioIndex; i++) {
      stockNames.push(headers[i])
    }

    console.log("🏢 原始股票名稱:", stockNames)

    // 確保至少有一個股票
    if (stockNames.length === 0) {
      throw new Error("CSV文件格式錯誤：找不到股票列")
    }

    console.log(`✅ 找到${stockNames.length}檔股票:`, stockNames)

    // 解析數據行
    csvData = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const values = line.split(delimiter)

      if (values.length >= headers.length) {
        // 直接使用對應的列值作為股票值
        const stockValues = []
        const stockRawValues = []
        for (let j = 0; j < stockNames.length; j++) {
          stockValues.push(Number.parseFloat(values[j]))
          stockRawValues.push(values[j])
        }

        const trendRatio = Number.parseFloat(values[trendRatioIndex])
        const rawTrendRatio = values[trendRatioIndex]
        const expectedReturn = Number.parseFloat(values[trendRatioIndex + 1])
        const rawExpectedReturn = values[trendRatioIndex + 1]
        const risk = Number.parseFloat(values[trendRatioIndex + 2])
        const rawRisk = values[trendRatioIndex + 2]
        const step = Number.parseFloat(values[trendRatioIndex + 3])
        const currentBest = values[trendRatioIndex + 4]
        const stageInfoElement = values[trendRatioIndex + 5]

        csvData.push({
          stockValues,
          stockRawValues,
          trendRatio,
          rawTrendRatio,
          expectedReturn,
          rawExpectedReturn,
          risk,
          rawRisk,
          step,
          currentBest,
          stageInfoElement,
        })
      }
    }

    totalGenerations = csvData.length
    console.log("📊 解析完成，總世代數:", totalGenerations)

    // 更新世代信息
    generationInfo.textContent = `世代: 1 / ${totalGenerations}`

    // 重置最佳TrendRatio變量
    bestTrendRatioGeneration = -1
    bestTrendRatioValue = Number.NEGATIVE_INFINITY
    bestTrendRatioStockValues = []

    // 顯示第一代數據
    showGeneration(0)
  }

  // 載入CSV檔案列表到選擇器
  function loadCsvFiles() {
    console.log("🔄 正在更新CSV選擇器...")

    // 清空選擇器（保留預設選項）
    while (csvSelector.options.length > 1) {
      csvSelector.remove(1)
    }

    // 使用從JSON載入的CSV檔案列表
    if (PREDEFINED_CSV_FILES.length > 0) {
      PREDEFINED_CSV_FILES.forEach((file) => {
        const option = document.createElement("option")
        option.value = file.path
        option.textContent = file.name
        csvSelector.appendChild(option)
        console.log(`➕ 添加選項: ${file.name} -> ${file.path}`)
      })
      console.log(`✅ 成功載入 ${PREDEFINED_CSV_FILES.length} 個CSV文件到選擇器`)
    } else {
      // 如果沒有檔案，顯示幫助信息
      const option = document.createElement("option")
      option.disabled = true
      option.textContent = "未找到CSV檔案 - 請運行 update_csv_list.py"
      csvSelector.appendChild(option)
      console.warn("⚠️ 沒有找到任何CSV文件")
    }
  }

  // 重新載入CSV檔案列表
  async function refreshCsvFilesList() {
    console.log("🔄 重新載入CSV檔案列表...")
    showStatusMessage("正在重新載入CSV文件列表...", "info")

    await loadCsvFilesList()
    loadCsvFiles()

    // 如果有檔案，自動載入第一個
    if (PREDEFINED_CSV_FILES.length > 0) {
      loadDefaultCsvFile()
    }
  }

  // 自動載入第一個預定義檔案
  function loadDefaultCsvFile() {
    if (PREDEFINED_CSV_FILES.length > 0) {
      const defaultFile = PREDEFINED_CSV_FILES[0]
      console.log("📁 自動載入預設文件:", defaultFile.name)
      showStatusMessage(`正在載入預設文件: ${defaultFile.name}`, "info")

      fetch(defaultFile.path)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`無法載入預設CSV檔案 (HTTP ${response.status})`)
          }
          return response.text()
        })
        .then((csvContent) => {
          try {
            // 清除現有數據
            csvData = []
            stockNames = []

            // 解析新數據
            parseCSV(csvContent)

            console.log("✅ 預設檔案載入後的股票名稱:", stockNames)
            console.log("📊 預設檔案載入後的股票數量:", stockNames.length)

            if (csvData.length > 0) {
              // 從頭重建圖表
              if (chart) {
                chart.destroy()
                chart = null
              }

              // 初始化圖表
              initChart(csvData[0].stockValues)
              currentGeneration = 0
              showGeneration(currentGeneration)
              updateButtonState()

              // 設置選擇器的值
              csvSelector.value = defaultFile.path

              showStatusMessage(`成功載入 ${defaultFile.name}，包含 ${totalGenerations} 個世代`, "success")
            } else {
              console.warn("⚠️ 預設CSV文件格式不正確或沒有數據")
              showStatusMessage("預設CSV文件沒有有效數據", "warning")
            }
          } catch (error) {
            console.error("❌ 解析預設CSV文件時出錯:", error)
            showStatusMessage("解析預設CSV文件時出錯: " + error.message, "error")
          }
        })
        .catch((error) => {
          console.error("❌ 載入預設CSV檔案時出錯:", error)
          showStatusMessage("載入預設CSV檔案時出錯: " + error.message, "error")
        })
    }
  }

  // 處理CSV檔案選擇
  function handleCsvSelection(event) {
    const selectedFile = event.target.value
    if (!selectedFile) return

    console.log("📁 用戶選擇文件:", selectedFile)
    showStatusMessage("正在載入選定的CSV文件...", "info")

    // 使用fetch API獲取選定的CSV檔案
    fetch(selectedFile)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`無法載入CSV檔案 (HTTP ${response.status})`)
        }
        return response.text()
      })
      .then((csvContent) => {
        try {
          // 清除現有數據
          csvData = []
          stockNames = []

          // 解析新數據
          parseCSV(csvContent)

          console.log("✅ 選擇後的股票名稱:", stockNames)
          console.log("📊 選擇後的股票數量:", stockNames.length)

          if (csvData.length > 0) {
            // 從頭重建圖表
            if (chart) {
              chart.destroy()
              chart = null
            }

            // 初始化圖表
            initChart(csvData[0].stockValues)
            currentGeneration = 0
            showGeneration(currentGeneration)
            updateButtonState()

            showStatusMessage(`成功載入CSV文件，包含 ${totalGenerations} 個世代`, "success")
          } else {
            showStatusMessage("CSV文件格式不正確或沒有數據", "error")
          }
        } catch (error) {
          console.error("❌ 解析CSV文件時出錯:", error)
          showStatusMessage("解析CSV文件時出錯: " + error.message, "error")
        }
      })
      .catch((error) => {
        console.error("❌ 載入CSV檔案時出錯:", error)
        showStatusMessage("載入CSV檔案時出錯: " + error.message, "error")
      })
  }

  // 顯示指定世代的數據
  function showGeneration(index) {
    if (csvData.length === 0 || index < 0 || index >= csvData.length) return

    currentGeneration = index
    const generation = csvData[index]

    // 更新世代信息
    generationInfo.textContent = `世代: ${index + 1} / ${totalGenerations}`

    // 更新指標信息
    trendRatioElement.textContent = generation.rawTrendRatio
    expectedReturnElement.textContent = generation.rawExpectedReturn
    riskElement.textContent = generation.rawRisk
    stepInfoElement.textContent = generation.step
    stageInfoElement.textContent = generation.stageInfoElement

    // 更新圖表
    updateChart(generation.stockValues)

    // 更新股票比例信息
    updateStockRatios(generation.stockValues)

    // 更新軸線視圖
    updateAxisView(generation.stockValues)

    // 計算最佳TrendRatio
    let currentBestGeneration = -1
    let currentBestTrendRatio = Number.NEGATIVE_INFINITY
    let currentBestStockValues = []

    if (generation.currentBest && !isNaN(Number.parseInt(generation.currentBest))) {
      const bestGenIndex = Number.parseInt(generation.currentBest)
      if (bestGenIndex >= 0 && bestGenIndex < csvData.length) {
        const bestGen = csvData[bestGenIndex]
        currentBestGeneration = bestGenIndex
        currentBestTrendRatio = bestGen.trendRatio
        currentBestStockValues = [...bestGen.stockValues]
      }
    } else {
      for (let i = 0; i <= currentGeneration; i++) {
        const gen = csvData[i]
        if (gen.trendRatio > currentBestTrendRatio) {
          currentBestTrendRatio = gen.trendRatio
          currentBestGeneration = i
          currentBestStockValues = [...gen.stockValues]
        }
      }
    }

    bestTrendRatioGeneration = currentBestGeneration
    bestTrendRatioValue = currentBestTrendRatio
    bestTrendRatioStockValues = currentBestStockValues

    updateBestTrendRatioInfo()
    updateButtonState()
  }

  // 初始化圖表
  function initChart(stockValues) {
    console.log("📊 初始化圖表，股票名稱:", stockNames)
    console.log("📈 初始化圖表，股票數據:", stockValues)

    if (chart) {
      chart.destroy()
      chart = null
    }

    const validStockValues = stockValues || Array(stockNames.length).fill(0)
    const colors = generateColors(stockNames.length)

    Chart.defaults.animation.duration = 800
    Chart.defaults.animation.easing = "easeOutQuart"

    chart = new Chart(chartCanvas, {
      type: "bar",
      data: {
        labels: stockNames.map((name) => name.replace(/\[(.*?)\](?:$$.*?$$)?/g, "$1")),
        datasets: [
          {
            label: "投資組合百分比",
            data: validStockValues,
            backgroundColor: colors,
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: "投資組合百分比 (%)",
            },
          },
          x: {
            title: {
              display: true,
              text: "股票",
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.raw}%`,
            },
          },
          datalabels: {
            display: (context) => showValues,
            color: "black",
            font: {
              weight: "bold",
              size: 20,
            },
            formatter: (value) => value + "%",
            anchor: "center",
            align: "center",
          },
        },
        animation: {
          duration: 800,
          easing: "easeOutQuart",
        },
      },
    })

    return chart
  }

  // 更新圖表數據
  function updateChart(stockValues) {
    if (!chart) {
      initChart(stockValues)
      return
    }

    let validStockValues = stockValues
    if (!validStockValues || validStockValues.length !== stockNames.length) {
      validStockValues = validStockValues || []
      while (validStockValues.length < stockNames.length) {
        validStockValues.push(0)
      }
      if (validStockValues.length > stockNames.length) {
        validStockValues = validStockValues.slice(0, stockNames.length)
      }
    }

    chart.data.datasets[0].data = validStockValues
    chart.data.labels = stockNames.map((name) => name.replace(/\[(.*?)\](?:$$.*?$$)?/g, "$1"))
    chart.data.datasets[0].backgroundColor = generateColors(stockNames.length)
    chart.options.plugins.datalabels.display = showValues
    chart.update()
  }

  // 生成顏色
  function generateColors(count) {
    const predefinedColors = [
      "rgba(255, 99, 132, 0.8)",
      "rgba(54, 162, 235, 0.8)",
      "rgba(255, 206, 86, 0.8)",
      "rgba(75, 192, 192, 0.8)",
      "rgba(153, 102, 255, 0.8)",
      "rgba(255, 159, 64, 0.8)",
      "rgba(199, 199, 199, 0.8)",
      "rgba(83, 102, 255, 0.8)",
      "rgba(78, 205, 196, 0.8)",
      "rgba(255, 99, 255, 0.8)",
    ]

    const colors = []
    for (let i = 0; i < count; i++) {
      if (i < predefinedColors.length) {
        colors.push(predefinedColors[i])
      } else {
        const hue = (i * 137.5) % 360
        colors.push(`hsla(${hue}, 70%, 60%, 0.8)`)
      }
    }
    return colors
  }

  // 其他必要的函數...
  function showPreviousGeneration() {
    if (currentGeneration > 0) {
      showGeneration(currentGeneration - 1)
    }
  }

  function showNextGeneration() {
    if (currentGeneration < csvData.length - 1) {
      showGeneration(currentGeneration + 1)
    }
  }

  function updateButtonState() {
    prevBtn.disabled = currentGeneration === 0 || csvData.length === 0 || isPlaying
    nextBtn.disabled = currentGeneration === csvData.length - 1 || csvData.length === 0 || isPlaying
  }

  function switchView(viewType) {
    if (viewType === "chart") {
      chartView.style.display = "block"
      axisView.style.display = "none"
      customView.style.display = "none"
      chartViewBtn.classList.add("active")
      axisViewBtn.classList.remove("active")
      customViewBtn.classList.remove("active")
    } else if (viewType === "axis") {
      chartView.style.display = "none"
      axisView.style.display = "block"
      customView.style.display = "none"
      chartViewBtn.classList.remove("active")
      axisViewBtn.classList.add("active")
      customViewBtn.classList.remove("active")
    } else if (viewType === "custom") {
      chartView.style.display = "none"
      axisView.style.display = "none"
      customView.style.display = "block"
      chartViewBtn.classList.remove("active")
      axisViewBtn.classList.remove("active")
      customViewBtn.classList.add("active")

      if (stockNames.length > 0) {
        generateCustomInputs()
      }
    }
  }

  function updateAxisView(stockValues) {
    if (!stockValues || stockValues.length === 0) return

    const firstStockRatio = stockValues[0]
    const secondStockRatio = stockValues[1]

    currentMarker.style.left = `${firstStockRatio}%`

    const firstStockName = stockNames[0] ? stockNames[0].replace(/\[(.*?)\](?:$$.*?$$)?/g, "$1") : "第一檔"
    const secondStockName = stockNames[1] ? stockNames[1].replace(/\[(.*?)\](?:$$.*?$$)?/g, "$1") : "第二檔"

    const currentStockName1 = document.getElementById("currentStockName1")
    if (currentStockName1) {
      currentStockName1.textContent = firstStockName
    }

    const currentTrendRatio = document.getElementById("currentTrendRatio")
    if (currentTrendRatio && currentGeneration >= 0 && currentGeneration < csvData.length) {
      currentTrendRatio.textContent = csvData[currentGeneration].trendRatio.toFixed(15)
    }

    const currentStockRatio1 = document.getElementById("currentStockRatio1")
    if (currentStockRatio1) {
      currentStockRatio1.textContent = `${firstStockRatio.toFixed(2)}%`
    }

    const firstBarFill = document.querySelector(".current-ratio .stock-bar-fill")
    if (firstBarFill) {
      firstBarFill.style.width = `${firstStockRatio}%`
      firstBarFill.style.backgroundColor = "#ff7b9c"
    }

    const currentStockName2 = document.getElementById("currentStockName2")
    if (currentStockName2) {
      currentStockName2.textContent = secondStockName
    }

    const currentStockRatio2 = document.getElementById("currentStockRatio2")
    if (currentStockRatio2) {
      currentStockRatio2.textContent = `${secondStockRatio.toFixed(2)}%`
    }

    const secondBarFill = document.querySelector(".current-ratio-second .stock-bar-fill")
    if (secondBarFill) {
      secondBarFill.style.width = `${secondStockRatio}%`
      secondBarFill.style.backgroundColor = "#54a0ff"
    }
  }

  function updateBestTrendRatioInfo() {
    if (bestTrendRatioGeneration === -1 || bestTrendRatioValue === Number.NEGATIVE_INFINITY) {
      bestGenerationElement.textContent = "-"
      bestTrendRatioElement.textContent = "-"
      return
    }

    bestGenerationElement.textContent = `${bestTrendRatioGeneration + 1}`
    bestTrendRatioElement.textContent = bestTrendRatioValue.toFixed(15)

    const axisBestTrendRatioDisplay = document.getElementById("axisBestTrendRatio")
    if (axisBestTrendRatioDisplay) {
      axisBestTrendRatioDisplay.textContent = bestTrendRatioValue.toFixed(15)
    }

    updateBestStockRatios(bestTrendRatioStockValues)

    if (bestTrendRatioStockValues && bestTrendRatioStockValues.length > 0 && stockNames.length > 0) {
      const bestFirstStockRatio = bestTrendRatioStockValues[0]
      const bestSecondStockRatio = bestTrendRatioStockValues[1]

      const firstStockName = stockNames[0] ? stockNames[0].replace(/\[(.*?)\](?:$$.*?$$)?/g, "$1") : "第一檔"
      const secondStockName = stockNames[1] ? stockNames[1].replace(/\[(.*?)\](?:$$.*?$$)?/g, "$1") : "第二檔"

      bestMarker.style.left = `${bestFirstStockRatio}%`

      const bestStockName1 = document.getElementById("bestStockName1")
      if (bestStockName1) {
        bestStockName1.textContent = firstStockName
      }

      const bestStockRatio1 = document.getElementById("bestStockRatio1")
      if (bestStockRatio1) {
        bestStockRatio1.textContent = `${bestFirstStockRatio.toFixed(2)}%`
      }

      const bestFirstBarFill = document.querySelector(".best-ratio .stock-bar-fill")
      if (bestFirstBarFill) {
        bestFirstBarFill.style.width = `${bestFirstStockRatio}%`
        bestFirstBarFill.style.backgroundColor = "#ff7b9c"
      }

      const bestStockName2 = document.getElementById("bestStockName2")
      if (bestStockName2) {
        bestStockName2.textContent = secondStockName
      }

      const bestStockRatio2 = document.getElementById("bestStockRatio2")
      if (bestStockRatio2) {
        bestStockRatio2.textContent = `${bestSecondStockRatio.toFixed(2)}%`
      }

      const bestSecondBarFill = document.querySelector(".best-ratio-second .stock-bar-fill")
      if (bestSecondBarFill) {
        bestSecondBarFill.style.width = `${bestSecondStockRatio}%`
        bestSecondBarFill.style.backgroundColor = "#54a0ff"
      }
    }
  }

  function updateBestStockRatios(stockValues) {
    bestStockRatiosContainer.innerHTML = ""

    if (!stockValues || stockValues.length === 0 || stockNames.length === 0) {
      const emptyMessage = document.createElement("div")
      emptyMessage.className = "stock-ratio-item"
      emptyMessage.innerHTML = '<span class="stock-name">無可用的股票數據</span>'
      bestStockRatiosContainer.appendChild(emptyMessage)
      return
    }

    const colors = generateColors(stockNames.length)
    const maxValue = Math.max(...stockValues)

    stockValues.forEach((value, index) => {
      if (index < stockNames.length) {
        const stockName = stockNames[index].replace(/\[(.*?)\](?:$$.*?$$)?/g, "$1")
        const stockItem = document.createElement("div")
        stockItem.className = "stock-ratio-item"

        const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0
        stockItem.style.setProperty("--stock-color", colors[index])

        stockItem.innerHTML = `
          <span class="stock-name">${stockName}</span>
          <span class="stock-value">${value.toFixed(2)}%</span>
          <div class="stock-bar">
            <div class="stock-bar-fill" style="width: ${percentage}%; background-color: ${colors[index]};"></div>
          </div>
        `

        bestStockRatiosContainer.appendChild(stockItem)
      }
    })
  }

  function updateStockRatios(stockValues) {
    stockRatiosContainer.innerHTML = ""

    if (!stockValues || stockValues.length === 0 || stockNames.length === 0) {
      const emptyMessage = document.createElement("div")
      emptyMessage.className = "stock-ratio-item"
      emptyMessage.innerHTML = '<span class="stock-name">無可用的股票數據</span>'
      stockRatiosContainer.appendChild(emptyMessage)
      return
    }

    const colors = generateColors(stockNames.length)
    const maxValue = Math.max(...stockValues)

    stockValues.forEach((value, index) => {
      if (index < stockNames.length) {
        const stockName = stockNames[index].replace(/\[(.*?)\](?:$$.*?$$)?/g, "$1")
        const stockItem = document.createElement("div")
        stockItem.className = "stock-ratio-item"

        const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0
        stockItem.style.setProperty("--stock-color", colors[index])

        stockItem.innerHTML = `
          <span class="stock-name">${stockName}</span>
          <span class="stock-value">${value.toFixed(2)}%</span>
          <div class="stock-bar">
            <div class="stock-bar-fill" style="width: ${percentage}%; background-color: ${colors[index]};"></div>
          </div>
        `

        stockRatiosContainer.appendChild(stockItem)
      }
    })
  }

  function togglePlay() {
    if (csvData.length === 0) return

    isPlaying = !isPlaying

    if (isPlaying) {
      playBtnText.textContent = "暫停"
      playBtn.classList.add("paused")
      prevBtn.disabled = true
      nextBtn.disabled = true

      if (currentGeneration === csvData.length - 1) {
        showGeneration(0)
      }

      playInterval = setInterval(() => {
        if (currentGeneration < csvData.length - 1) {
          showGeneration(currentGeneration + 1)
        } else {
          stopPlaying()
        }
      }, playSpeedValue)
    } else {
      stopPlaying()
    }
  }

  function stopPlaying() {
    isPlaying = false
    playBtnText.textContent = "播放"
    playBtn.classList.remove("paused")
    clearInterval(playInterval)
    updateButtonState()
  }

  function updatePlaySpeed() {
    playSpeedValue = Number.parseInt(playSpeed.value)

    if (isPlaying) {
      clearInterval(playInterval)
      playInterval = setInterval(() => {
        if (currentGeneration < csvData.length - 1) {
          showGeneration(currentGeneration + 1)
        } else {
          stopPlaying()
        }
      }, playSpeedValue)
    }
  }

  function toggleValueDisplay() {
    showValues = !showValues

    if (showValues) {
      toggleValueBtn.textContent = "隱藏數值"
      toggleValueBtn.classList.add("active")
    } else {
      toggleValueBtn.textContent = "顯示數值"
      toggleValueBtn.classList.remove("active")
    }

    if (chart && csvData.length > 0) {
      const currentAnimation = chart.options.animation
      chart.options.plugins.datalabels.display = showValues
      chart.options.animation = currentAnimation
      chart.update()
    }
  }

  // 簡化的自定義比例功能
  function generateCustomInputs() {
    // 這裡可以添加自定義比例輸入的實現
    customStockInputs.innerHTML = "<p>自定義比例功能開發中...</p>"
  }

  function calculateCustomRatios() {
    alert("自定義比例計算功能開發中...")
  }

  function resetCustomInputs() {
    generateCustomInputs()
    customTrendRatioElement.textContent = "-"
    customExpectedReturnElement.textContent = "-"
    customRiskElement.textContent = "-"
  }

  // ===== 初始化應用程序 =====
  async function initializeApp() {
    console.log("🚀 正在初始化應用程序...")

    try {
      // 載入CSV檔案列表
      const success = await loadCsvFilesList()

      if (!success) {
        console.warn("⚠️ CSV文件列表載入失敗，但應用程序將繼續運行")
      }

      // 載入CSV檔案到選擇器
      loadCsvFiles()

      // 自動載入預設檔案
      if (PREDEFINED_CSV_FILES.length > 0) {
        console.log("📁 自動載入第一個CSV文件...")
        loadDefaultCsvFile()
      } else {
        console.log("📋 沒有可用的CSV文件，等待用戶上傳或添加文件")
        showHelpMessage()
      }

      console.log("✅ 應用程序初始化完成")
    } catch (error) {
      console.error("❌ 應用程序初始化失敗:", error)
      showStatusMessage("應用程序初始化失敗: " + error.message, "error")
    }
  }

  // 啟動應用程序
  initializeApp()
})
