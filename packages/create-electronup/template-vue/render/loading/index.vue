<script setup lang="ts">
import { init } from 'echarts'
import { onMounted, ref } from 'vue'

const chartDom = ref<HTMLElement>()

onMounted(() => {
  chartDom.value && init(chartDom.value).setOption({
    graphic: {
      elements: [
        {
          type: 'text',
          left: 'center',
          top: 'center',
          style: {
            text: 'Electron Up !',
            fontSize: 80,
            fontWeight: 'bold',
            lineDash: [0, 200],
            lineDashOffset: 0,
            fill: 'transparent',
            stroke: '#c4d7d6',
            lineWidth: 1
          },
          keyframeAnimation: {
            duration: 2000,
            loop: true,
            keyframes: [
              {
                percent: 0.7,
                style: {
                  fill: 'transparent',
                  lineDashOffset: 200,
                  lineDash: [200, 0]
                }
              },
              {
              // Stop for a while.
                percent: 0.8,
                style: {
                  fill: 'transparent'
                }
              },
              {
                percent: 1,
                style: {
                  fill: '#c4d7d6'
                }
              }
            ]
          }
        }
      ]
    }
  })
})
</script>

<template>
  <div ref="chartDom" class="login-logo" />
</template>

<style scoped>
.login-logo{
  height:200px;
  width: 700px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
