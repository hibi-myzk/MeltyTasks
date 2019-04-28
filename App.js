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
  TouchableOpacity
} from 'react-native';
import SafeAreaView from 'react-native-safe-area-view';
import { SwipeListView } from 'react-native-swipe-list-view';
import uuid from "uuid";

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

          tasks.splice(0, 0, { key: key, text: text, done: false })

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
          return({ key: newKey, text: t.text, done: true })
        });

        tasks = tasks.concat(ts);

        delete this.rowTranslateAnimatedValues[key]
        this.rowTranslateAnimatedValues[newKey] = new Animated.Value(1);

        return { tasks: tasks };
      },
      () => Tasks.save(this.state.tasks)
    );
  };

  componentDidMount() {
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
    });
  }

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
              <View style={styles.backLeftBtn}>
                <Text style={styles.backTextWhite}>Done</Text>
              </View>
              <TouchableOpacity
                style={[styles.backRightBtn, {
                  width: this.state.rightButtonWidth
                }]}
                onPress={ _ => this.deleteTask(data.item.key) }>
  							<Text style={styles.backTextWhite}>Close</Text>
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
            style={styles.litTiem}
            numberOfLines={0} >
            {item.text}
          </Text>
        </View>
      );
    } else {
      return (
        <Animated.View style={[styles.rowFrontContainer,
          {
            height: this.rowTranslateAnimatedValues[item.key].interpolate({
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
                  style={styles.litTiem}
                  numberOfLines={0} >
                  {item.text}
                </Text>
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
    paddingTop: 20
  },
  list: {
    width: "100%"
  },
  listItem: {
    paddingTop: 2,
    paddingBottom: 2,
    fontSize: 18
  },
  separator: {
    height: 1,
    backgroundColor: "gray"
  },
  rowFrontContainer: {},
  rowFront: {
    alignItems: 'center',
		backgroundColor: '#CCC',
		borderBottomColor: 'black',
		borderBottomWidth: 1,
		justifyContent: 'center',
		height: 50,
  },
  rowFrontDone: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomColor: 'black',
    borderBottomWidth: 1,
    justifyContent: 'center',
    height: 50,
  },
  rowBack: {
    alignItems: 'center',
		backgroundColor: '#DDD',
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingLeft: 15,
  },
  backLeftBtn: {
		alignItems: 'center',
		bottom: 0,
		justifyContent: 'center',
		position: 'absolute',
		top: 0,
		width: 75,
    backgroundColor: '#fff',
		left: 0
	},
  backRightBtn: {
		alignItems: 'center',
		bottom: 0,
		justifyContent: 'center',
		position: 'absolute',
		top: 0,
		// width: 75,
    backgroundColor: 'red',
		right: 0
	},
  listItemCont: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  listItemContDone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: '#fff'
  },
  textInput: {
    height: 40,
    paddingRight: 10,
    paddingLeft: 10,
    borderColor: "gray",
    borderWidth: isAndroid ? 0 : 1,
    width: "100%"
  }
});

AppRegistry.registerComponent("TodoList", () => TodoList);
