<template>
    
    <VLayout row wrap>
      <VFlex xs12 sm12 md8 justifyCenter>
        <VTabs>
          <VTab :key="0">
            {{ $tr('whats_inside') }}
          </VTab>
          <VTabItem :key="0">
            <VLayout row wrap>
              <VFlex v-if="countBar" xs6>
                {{ $tr('resource_size') }}
                <span id="count_gauge" data-toggle="tooltip" data-placement="top" :title="$tr('resource_count', { count: channelDetails.resource_count}) + '-' + countBar.text">
                  <b v-for="(fill, i) in countBar.filled" :key="i" class="count_icon" :class="fill ? 'filled' : ''">
                    ▮
                  </b>
                </span>
              </VFlex>
              <VFlex v-if="sizeBar" xs6>
                {{ $tr('storage') }}
                <span data-toggle="tooltip" data-placement="top" :title="channelDetails.resource_size + '-' + sizeBar.text">
                  <VIcon v-for="(fill, i) in sizeBar.filled" :key="i">
                    sd_storage
                  </VIcon>
                </span>
              </VFlex>
            </VLayout>
            <VLayout row wrap>
              <template v-if="channelDetails.kind_count">
                <VFlex xs8>
                  <!-- D3 Pie chart will be inserted here -->
                </VFlex>
                <VFlex xs4>
                  <!-- D3 Legend will be inserted here -->
                </VFlex>
              </template>
            </VLayout>
            <VLayout row wrap>
              <VFlex xs12>
                {{ $tr('includes') }}
                <VLayout row wrap>
                  <VFlex v-if="channelDetails.languages" xs6>
                    <p>{{ $tr('languages') }}</p>
                    <VChip v-for="lang in channelDetails.languages.slice(0, 9)" :key="lang">
                      {{ lang }}
                    </VChip>
                    <VExpansionPanel v-if="channelDetails.languages.length > 10">
                      <VExpansionPanelContent>
                        <template v-slot:header>
                          {{ $tr('more', {more: channelDetails.languages.length - 10}) }}
                        </template>
                        <VChip v-for="lang in channelDetails.languages.slice(10)" :key="lang">
                          {{ lang }}
                        </VChip>
                      </VExpansionPanelContent>
                    </VExpansionPanel>
                  </VFlex>
                  <VFlex v-if="channelDetails.accessible_languages" xs6>
                    <p>{{ $tr('accessible_languages') }}</p>
                    <VChip v-for="lang in channelDetails.accessible_languages.slice(0, 9)" :key="lang">
                      {{ lang }}
                    </VChip>
                    <VExpansionPanel v-if="channelDetails.accessible_languages.length > 10">
                      <VExpansionPanelContent>
                        <template v-slot:header>
                          {{ $tr('more', {more: channelDetails.accessible_languages.length - 10}) }}
                        </template>
                        <VChip v-for="lang in channelDetails.accessible_languages.slice(10)" :key="lang">
                          {{ lang }}
                        </VChip>
                      </VExpansionPanelContent>
                    </VExpansionPanel>
                  </VFlex>
                </VLayout>
                <VLayout v-if="channelDetails.includes.coach_content || channelDetails.includes.exercises" row wrap>
                  <VFlex xs4>
                    {{ $tr('instructor_resources') }}
                  </VFlex>
                  <VFlex v-if="channelDetails.includes.coach_content" xs4>
                    <VChip :title="$tr('role_description')">
                      {{ $tr('coach_content') }}
                    </VChip>
                  </VFlex>
                  <VFlex v-if="channelDetails.includes.exercises" xs4>
                    <VChip :title="$tr('role_description')">
                      {{ $tr('assessments') }}
                    </VChip>
                  </VFlex>
                </VLayout>
                <VLayout v-if="channelDetails.sample_nodes" row wrap>
                  <VFlex xs6>
                    {{ $tr('preview') }}
                    <VLayout v-if="channelDetails.simple_pathway" row wrap>
                      <VFlex xs12>
                        <a
                          v-for="node in channelDetails.simple_pathway"
                          :key="node.node_id"
                          :href="nodeLink(node.node_id)"
                          target="_blank"
                        >
                          <VChip>
                            <VIcon>{{ node.kind | kindIcon }}</VIcon>
                            {{ node.title }}
                          </VChip>
                        </a>
                      </VFlex>
                    </VLayout>
                    <VLayout row wrap justifyCenter>
                      <VFlex v-for="node in channelDetails.sample_nodes" :key="node.node_id" xs3>
                        <a
                          :href="nodeLink(node.node_id)"
                          target="_blank"
                        >
                          <VImg contain :src="node.thumbnail" />
                          <h5>{{ node.title }}</h5>
                        </a>
                      </VFlex>
                    </VLayout>
                    <VLayout v-if="channelDetails.tags" row wrap>
                      <VFlex xs12>
                        <!-- Tag cloud will be inserted here -->
                      </VFlex>
                    </VLayout>
                  </VFlex>
                </VLayout>
              </VFlex>
            </VLayout>
          </VTabItem>
          <VTab :key="1">
            {{ $tr('source') }}
          </VTab>
          <VTabItem :key="1">
            <VLayout row wrap>
              <VFlex v-if="channelDetails.authors" xs4>
                <VIcon>edit</VIcon>
                <p>{{ $tr('authors') }}</p>
                <VChip v-for="author in channelDetails.authors.slice(0, 9)" :key="author">
                  {{ author }}
                </VChip>
                <VExpansionPanel v-if="channelDetails.authors.length > 10">
                  <VExpansionPanelContent>
                    <template v-slot:header>
                      {{ $tr('more', {more: channelDetails.authors.length - 10}) }}
                    </template>
                    <VChip v-for="author in channelDetails.authors.slice(10)" :key="author">
                      {{ author }}
                    </VChip>
                  </VExpansionPanelContent>
                </VExpansionPanel>
              </VFlex>
              <VFlex v-if="channelDetails.providers" xs4>
                <VIcon>pan_tool</VIcon>
                <p>{{ $tr('providers') }}</p>
                <VChip v-for="provider in channelDetails.providers.slice(0, 9)" :key="provider">
                  {{ provider }}
                </VChip>
                <VExpansionPanel v-if="channelDetails.providers.length > 10">
                  <VExpansionPanelContent>
                    <template v-slot:header>
                      {{ $tr('more', {more: channelDetails.providers.length - 10}) }}
                    </template>
                    <VChip v-for="provider in channelDetails.providers.slice(10)" :key="provider">
                      {{ provider }}
                    </VChip>
                  </VExpansionPanelContent>
                </VExpansionPanel>
              </VFlex>
              <VFlex v-if="channelDetails.aggregators" xs4>
                <VIcon>inbox</VIcon>
                <p>{{ $tr('aggregators') }}</p>
                <VChip v-for="aggregator in channelDetails.aggregators.slice(0, 9)" :key="aggregator">
                  {{ aggregator }}
                </VChip>
                <VExpansionPanel v-if="channelDetails.aggregators.length > 10">
                  <VExpansionPanelContent>
                    <template v-slot:header>
                      {{ $tr('more', {more: channelDetails.aggregators.length - 10}) }}
                    </template>
                    <VChip v-for="aggregator in channelDetails.aggregators.slice(10)" :key="aggregator">
                      {{ aggregator }}
                    </VChip>
                  </VExpansionPanelContent>
                </VExpansionPanel>
              </VFlex>
              <VLayout row wrap>
                <VFlex xs2>
                  <VIcon right>
                    copyright
                  </VIcon>
                </VFlex>
                <VFlex xs10>
                  <VLayout row wrap>
                    <VFlex v-if="channelDetails.licenses" xs12>
                      {{ $tr('license', { count: channelDetails.licenses.length }) }}
                      <VChip v-for="license in channelDetails.licenses" :key="license">
                        {{ $tr(license) }}
                      </VChip>
                    </VFlex>
                    <VFlex v-if="channelDetails.licenses" xs12>
                      {{ $tr('copyright_holder', { count: channelDetails.copyright_holders.length }) }}
                      <VChip v-for="copyright_holder in channelDetails.copyright_holders" :key="copyright_holder">
                        {{ copyright_holder }}
                      </VChip>
                    </VFlex>
                  </VLayout>
                </VFlex>
              </VLayout>
              <VLayout v-if="channelDetails.original_channels" row wrap>
                <VFlex xs12>
                  {{ $tr('original_channels') }}
                  <a
                    v-for="chan in channelDetails.original_channels"
                    :key="chan.id"
                    :href="channelLink(chan.id)"
                    target="_blank"
                  >
                    <VImg v-if="chan.thumbnail" :src="chan.thumbnail" />
                    <VTooltip bottom>
                      <template v-slot:activator="{ on }">
                        <span v-on="on">
                          {{ chan.name }}
                        </span>
                      </template>
                      <span>{{ $tr('resource_count', {count: chan.count }) }}</span>
                    </VTooltip>
                  </a>
                </VFlex>
              </VLayout>
            </VLayout>
          </VTabItem>
          <VTab v-if="channel.published" :key="2">
            {{ $tr('using_channel') }}
          </VTab>
          <VTabItem v-if="channel.published" :key="2">
            <VLayout row wrap>
              <VFlex xs12>
                {{ $tr('copy_text') }}
                <VLayout row wrap>
                  <VFlex xs4>
                    {{ $tr('channel_tokens', { count: channel.secret_tokens && channel.secret_tokens.length || 0}) }}
                    {{ $tr('recommended') }}
                  </VFlex>
                  <VFlex xs8>
                    <CopyToken :token="channel.primary_token" />
                  </VFlex>
                </VLayout>
                <VLayout row wrap>
                  <VFlex xs4>
                    {{ $tr('channel_id') }}
                  </VFlex>
                  <VFlex xs8>
                    <CopyToken :token="channel.id" />
                  </VFlex>
                </VLayout>
              </VFlex>
            </VLayout>
          </VTabItem>
        </VTabs>
      </VFlex>
    </VLayout>

</template>