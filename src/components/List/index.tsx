import Taro, { PureComponent } from '@tarojs/taro';

import './index.less';
import { ListProps } from './index.h5';

export default class TaroList extends PureComponent<ListProps> {
  static options = {
    addGlobalClass: true
  };

  render() {
    return this.props.children;
  }
}