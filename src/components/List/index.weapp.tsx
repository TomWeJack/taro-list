import Taro, { PureComponent } from '@tarojs/taro';
import { View, ScrollView } from '@tarojs/components';

import { ListProps, ListPropTypes } from './types';
import {
  MAX_REFRESHING_TIME,
  HEIGHT,
  DISTANCE_TO_REFRESH,
  DAMPING
} from './config';
import { normalizeValue, normalizeStyle } from './VirtualList/utils';
import VirtualList from './VirtualList';
import throttle from './lodash.throttle';
import './index.less';

interface ListWeappState {
  // 用于 和 wxs 通信主动关闭刷新
  closed: boolean;
  containerSize: number;
  scrollTop: number | undefined;
}

export default class TaroList extends PureComponent<ListProps, ListWeappState> {
  static defaultProps: Partial<ListProps> = {
    height: HEIGHT,
    className: '',
    width: '100%',
    distanceToRefresh: DISTANCE_TO_REFRESH,
    damping: DAMPING
  };

  static propTypes = ListPropTypes;

  static options = {
    addGlobalClass: true
  };

  static index = 0;

  private virtualListRef = Taro.createRef<VirtualList>();
  private refreshTimer: number = 0;
  private domId = `zyouh-list__id-${TaroList.index++}`;

  constructor(props: ListProps) {
    super(props);

    this.state = {
      containerSize: 0,
      closed: false,
      scrollTop: undefined
    };
  }

  componentWillMount() {
    this.$scope.onRefresh = this.onRefresh;
  }

  componentDidMount() {
    if (this.props.virtual) {
      this.setVirtualListHeight();
    }
  }

  componentDidUpdate(prevProps: ListProps) {
    const { disabled, height } = this.props;
    if (prevProps.height !== height && height) {
      this.setVirtualListHeight();
    }

    if (disabled && disabled !== prevProps.disabled) {
      this.setState({
        closed: true
      });
    }
  }

  componentWillUnmount() {
    this.handleScroll.cancel();
  }

  private onScrollOffsetChange = (offset: number) => {
    this.setState({
      scrollTop: offset
    });
  };

  private setVirtualListHeight() {
    const query = Taro.createSelectorQuery().in(this.$scope);

    query.select(`#${this.domId}`).boundingClientRect();
    query.exec(rect => {
      this.setState({
        containerSize: rect[0].height
      });
    });
  }

  private handleScrollToLower = () => {
    const { onLoadMore } = this.props;

    if (typeof onLoadMore === 'function') {
      onLoadMore();
    }
  };

  private handleScroll = throttle(evt => {
    if (this.props.virtual && this.virtualListRef.current) {
      this.virtualListRef.current!.setScrollOffset(evt.detail.scrollTop);
    }
  }, 50);

  private onRefresh = () => {
    const { onRefresh } = this.props;

    this.clearResfreshTimer();
    this.setState({
      closed: false
    });

    const cancel = () => {
      this.clearResfreshTimer();
      if (!this.props.refreshing) {
        this.setState({
          closed: true
        });
      }
    };

    // @ts-ignore
    this.refreshTimer = setTimeout(cancel, MAX_REFRESHING_TIME);

    if (typeof onRefresh === 'function') {
      onRefresh(cancel);
    }
  };

  clearResfreshTimer = () => {
    clearTimeout(this.refreshTimer);
  };

  render() {
    const props = this.props;
    const {
      style,
      width,
      className,
      custom,
      distanceToRefresh,
      damping,
      refreshing,
      height,
      virtual,
      scrollToIndex,
      scrollWithAnimation,
      enableBackToTop,
      dataManager,
      disabled
    } = props;
    const { containerSize, scrollTop } = this.state;

    const cls = `zyouh-list__container ${className}`.trim();
    const scrollerStyle = normalizeStyle({
      width: '100%',
      height
    });

    const refreshConfig = {
      damping,
      distanceToRefresh,
      id: this.domId,
      disabled
    };

    const indicatorStyle = {
      height: normalizeValue(distanceToRefresh)
    };

    return (
      <View data-refreshing={refreshing} style={style} className={cls}>
        <wxs module='refresh' src='./refresh.wxs'></wxs>
        <include src='./index.template.wxml' />
        <ScrollView
          id={this.domId}
          style={scrollerStyle}
          className='zyouh-list__scroller-view'
          onScrollToLower={this.handleScrollToLower}
          onScroll={this.handleScroll}
          scrollTop={scrollTop}
          onTouchStart='{{refresh.handleTouchStart}}'
          onTouchMove='{{refresh.handleTouchMove}}'
          onTouchEnd='{{refresh.handleTouchEnd}}'
          onTouchCancel='{{refresh.handleTouchEnd}}'
          scrollWithAnimation={scrollWithAnimation}
          enableBackToTop={enableBackToTop}
          scrollY
        >
          {!custom && (
            <View
              style={indicatorStyle}
              className='zyouh-list__indicator-container'
            >
              <View className='zyouh-list__indicator zyouh-list__indicator--dot'>
                <View className='zyouh-list__indicator-dot'></View>
                <View className='zyouh-list__indicator-dot'></View>
                <View className='zyouh-list__indicator-dot'></View>
              </View>
            </View>
          )}
          <View data-config={refreshConfig} className='zyouh-list__body'>
            {virtual ? (
              <VirtualList
                width={width}
                ref={this.virtualListRef}
                height={containerSize}
                scrollToIndex={scrollToIndex}
                onOffsetChange={this.onScrollOffsetChange}
                dataManager={dataManager}
              >
                {props.children}
              </VirtualList>
            ) : (
              props.children
            )}
          </View>
        </ScrollView>
      </View>
    );
  }
}
