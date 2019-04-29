import React from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  FlatList,
  AsyncStorage,
  Button,
  TextInput,
  Keyboard,
  Platform,
  Animated,
  TouchableHighlight,
  TouchableOpacity,
  AppState
} from 'react-native';
import SafeAreaView from 'react-native-safe-area-view';
import { SwipeListView } from 'react-native-swipe-list-view';
import uuid from "uuid";
import moment from 'moment'
// import 'moment/locale/ja'

const isAndroid = Platform.OS == "android";
const viewPadding = 10;

export default class App extends React.Component {
  state = {
    tasks: [],
    text: "",
    rightButtonWidth: 75
  };

  rowTranslateAnimatedValues = {};
  animationIsRunning = false;

  changeTextHandler = text => {
    this.setState({ text: text });
  };

  addTask = () => {
    let notEmpty = this.state.text.trim().length > 0;

    if (notEmpty) {
      this.setState(
        prevState => {
          let { tasks, text, rightButtonWidth } = prevState;
          let key = uuid.v4();

          this.rowTranslateAnimatedValues[key] = new Animated.Value(1);

          tasks.splice(0, 0, { key: key, text: text, done: false, at: new Date() })

          return {
            tasks: tasks,
            text: "",
            rightButtonWidth: rightButtonWidth
          };
        },
        () => Tasks.save(this.state.tasks)
      );
    }
  };

  deleteTask = key => {
    this.setState(
      prevState => {
        let tasks = prevState.tasks.slice();

        let i = tasks.findIndex(item => item.key === key);

        tasks.splice(i, 1);

        delete this.rowTranslateAnimatedValues[key]

        return { tasks: tasks };
      },
      () => Tasks.save(this.state.tasks)
    );
  };

  doneTask = key => {
    this.setState(
      prevState => {
        var tasks = prevState.tasks.slice();

        let newKey = uuid.v4();

        let i = tasks.findIndex(item => item.key === key);

        var ts = tasks.splice(i, 1);
        ts = ts.map((t) => {
          return({ key: newKey, text: t.text, done: !t.done, at: t.at })
        });

        tasks = tasks.concat(ts);
        tasks = tasks.sort((a, b) => {
          if (a.done == b.done) return 0;
          return (a.done == true) ? 1 : -1;
        })

        delete this.rowTranslateAnimatedValues[key]
        this.rowTranslateAnimatedValues[newKey] = new Animated.Value(1);

        return { tasks: tasks };
      },
      () => Tasks.save(this.state.tasks)
    );
  };

  meltTasks = () => {
    let now = moment();

    let tasks = this.state.tasks.slice();

    for (var i in tasks) {
      let t = tasks[i];

      if (moment(t.at).add(24, 'hours') < now) {
        this.deleteTask(t.key);
      }
    }
  };

  componentDidMount() {
    AppState.addEventListener('change', this._handleAppStateChange);

    Keyboard.addListener(
      isAndroid ? "keyboardDidShow" : "keyboardWillShow",
      e => this.setState({ viewPadding: e.endCoordinates.height + viewPadding })
    );

    Keyboard.addListener(
      isAndroid ? "keyboardDidHide" : "keyboardWillHide",
      () => this.setState({ viewPadding: viewPadding })
    );

    Tasks.all(tasks => {
      for (var i in tasks) {
        this.rowTranslateAnimatedValues[tasks[i].key] = new Animated.Value(1);
      }

      this.setState({ tasks: tasks || [] });

      this.meltTasks();
    });
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this._handleAppStateChange);
  }

  _handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active') {
      this.setState({ tasks: this.state.tasks });
      this.meltTasks();
    }
  };

  onSwipeValueChange = (swipeData) => {
    const { key, value } = swipeData;

    if (value < 0) {
      this.setState({ rightButtonWidth: 75 });
    } else if (0 < value && !this.animationIsRunning) {
      this.setState({ rightButtonWidth: 0 });
    }

    // 375 or however large your screen is (i.e. Dimensions.get('window').width)
    if (375 < value && !this.animationIsRunning) {
      this.animationIsRunning = true;
      Animated.timing(this.rowTranslateAnimatedValues[key], { toValue: 0, duration: 200 }).start(() => {
          this.doneTask(key);
          this.setState({ rightButtonWidth: 75 });
          this.animationIsRunning = false;
      });
    }
  }

  render() {
    return (
      <SafeAreaView
        style={[styles.container, { paddingBottom: this.state.viewPadding }]}
      >
        <SwipeListView
          useFlatList
          style={styles.list}
          data={this.state.tasks}
          renderItem={this._renderItem.bind(this)}
          renderHiddenItem={ (data, rowMap) => (
            <View style={styles.rowBack}>
              <View style={styles.backLeftButton}>
                <Text style={styles.backText}>
                  {data.item.done ? 'Undo' : 'Done'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.backRightButton, {
                  width: this.state.rightButtonWidth
                }]}
                onPress={ _ => this.deleteTask(data.item.key) }>
  							<Text style={styles.backButtonText}>Delete</Text>
  						</TouchableOpacity>
            </View>
          )}
          keyExtractor={(item, index) => item.key}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          leftOpenValue={375}
          rightOpenValue={-75}
          onSwipeValueChange={this.onSwipeValueChange}
        />
        <TextInput
          style={styles.textInput}
          onChangeText={this.changeTextHandler}
          onSubmitEditing={this.addTask}
          value={this.state.text}
          placeholder="Add Tasks"
          returnKeyType="done"
          returnKeyLabel="done"
        />
      </SafeAreaView>
    );
  }

  _renderItem({ item, index }) {
    if (item.done) {
      return (
        <View style={styles.rowFrontDone} >
          <Text
            style={styles.listTextDone}
            numberOfLines={0} >
            {item.text}
          </Text>
          <Text style={styles.timeDone}>{moment(item.at).fromNow()}</Text>
        </View>
      );
    } else {
      return (
        <Animated.View style={[styles.rowFrontContainer,
          {
            minHeight: this.rowTranslateAnimatedValues[item.key].interpolate({
              inputRange: [0, 1],
              outputRange: [0, 50],
            })
          }
        ]}>
            <TouchableHighlight
              onPress={ _ => console.log('You touched me') }
              style={styles.rowFront}
              underlayColor={'#AAA'}
            >
              <View style={styles.listItemCont} >
                <Text
                  style={styles.listText}
                  numberOfLines={0} >
                  {item.text}
                </Text>
                <Text style={styles.time}>{moment(item.at).fromNow()}</Text>
              </View>
            </TouchableHighlight>
        </Animated.View>
      );
    }
  }
}

let Tasks = {
  all(callback) {
    return AsyncStorage.getItem("TASKS", (err, data) => {
        tasks = JSON.parse(data) || [];
        tasks = tasks.sort((a, b) => {
          if (a.done == b.done) return 0;
          return (a.done == true) ? 1 : -1;
        })
        callback(tasks);
      }
    );
  },
  save(tasks) {
    AsyncStorage.setItem("TASKS", JSON.stringify(tasks));
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5FCFF",
    padding: viewPadding,
    paddingTop: 60,
    paddingBottom: 60
  },
  list: {
    width: "100%"
  },
  separator: {
    height: 1,
    backgroundColor: '#F5FCFF'
  },
  rowFrontContainer: {},
  rowFront: {
		backgroundColor: '#e54e4e',
		justifyContent: 'center',
		minHeight: 50,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 4,
    paddingBottom: 4,
  },
  rowFrontDone: {
    backgroundColor: '#e2e2e2',
    justifyContent: 'center',
    minHeight: 50,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 4,
    paddingBottom: 4,
  },
  listText: {
    color: '#fff',
    fontSize: 22,
  },
  listTextDone: {
    color: '#000',
    fontSize: 18,
  },
  time: {
    marginTop: 4,
    textAlign: 'right',
    color: '#fff',
    fontSize: 16,
  },
  timeDone: {
    marginTop: 4,
    textAlign: 'right',
    color: '#000',
    fontSize: 16,
  },
  rowBack: {
    alignItems: 'center',
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingLeft: 15,
  },
  backLeftButton: {
		alignItems: 'center',
		bottom: 0,
		justifyContent: 'center',
		position: 'absolute',
		top: 0,
		width: 75,
		left: 0
	},
  backRightButton: {
		alignItems: 'center',
		bottom: 0,
		justifyContent: 'center',
		position: 'absolute',
		top: 0,
		// width: 75,
    backgroundColor: 'red',
		right: 0
	},
  backButtonText: {
    color: '#fff',
  },
  listItemCont: {},
  textInput: {
    height: 40,
    paddingRight: 10,
    paddingLeft: 10,
    borderColor: "gray",
    borderWidth: isAndroid ? 0 : 1,
    width: "100%"
  }
});
