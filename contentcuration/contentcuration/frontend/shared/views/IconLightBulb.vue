<template>

  <span :style="style">
    <svg
      version="1.1"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="8" r="8" :fill="bgColor" />
      <!-- eslint-disable-next-line -->
      <path d="m8 3.2743a3.308 3.308 0 0 1 3.308 3.308c0 1.1247-0.56236 2.1124-1.4177 2.7125v1.068a0.47257 0.47257 0 0 1-0.47257 0.47257h-2.8354a0.47257 0.47257 0 0 1-0.47257-0.47257v-1.068c-0.85535-0.60016-1.4177-1.5878-1.4177-2.7125a3.308 3.308 0 0 1 3.308-3.308m-1.4177 8.9788v-0.47257h2.8354v0.47257a0.47257 0.47257 0 0 1-0.47257 0.47257h-1.8903a0.47257 0.47257 0 0 1-0.47257-0.47257m1.4177-8.0337a2.3628 2.3628 0 0 0-2.3628 2.3628c0 0.96876 0.58126 1.8005 1.4177 2.1644v1.1436h1.8903v-1.1436c0.83645-0.36388 1.4177-1.1956 1.4177-2.1644a2.3628 2.3628 0 0 0-2.3628-2.3628z"
            :fill="color"
            stroke-width=".47257"
      />
    </svg>
  </span>

</template>

<script>

  export default {
    name: 'IconLightBulb',
    props: {
      color: {
        type: String,
        default: '#fff',
      },
      bgColor: {
        type: String,
        default: '#996189',
      },
      size: {
        type: Number,
        default: 16,
      },
    },
    computed: {
      style() {
        return {
          display: 'inline-block',
          margin: '2px 2px',
          width: `${this.size}px`,
          height: `${this.size}px`,
        };
      },
    },
  };

</script>
