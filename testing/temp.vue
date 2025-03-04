<template #context-menu="{ showContextMenu, positionX, positionY }">
    <ContentNodeContextMenu
      :show="showContextMenu"
      :positionX="positionX"
      :positionY="positionY"
      :nodeId="nodeId"
    />
  </template>