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

const isAndroid = Platform.OS == "android";
const viewPadding = 10;

export default class App extends React.Component {
  state = {
    tasks: [],
    doneTasks: [],
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
          let { tasks, doneTasks, text, rightButtonWidth } = prevState;
          let key = tasks.length.toString();

          this.rowTranslateAnimatedValues[key] = new Animated.Value(1);

          return {
            tasks: tasks.concat({ key: key, text: text, done: false }),
            doneTasks: doneTasks,
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

        let i = Number(key);

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
        let tasks = prevState.tasks.slice();

        let i = Number(key);

        delete this.rowTranslateAnimatedValues[key]
        this.rowTranslateAnimatedValues['done' + key] = new Animated.Value(1);

        var ts = tasks.splice(i, 1);
        ts = ts.map((t) => {
          return({ key: 'done' + t.key, text: t.text, done: true })
        });

        return {
          tasks: tasks,
          doneTasks: prevState.doneTasks.concat(ts)
        };
      },
      () => {
        Tasks.save(this.state.tasks);
        DoneTasks.save(this.state.doneTasks)
      }
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

    DoneTasks.all(tasks => {
      for (var i in tasks) {
        this.rowTranslateAnimatedValues[tasks[i].key] = new Animated.Value(1);
      }

      this.setState({ doneTasks: tasks || [] });
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
          data={this.state.tasks.concat(this.state.doneTasks)}
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
        <View style={styles.listItemContDone} >
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
  convertToArrayOfObject(tasks, callback) {
    return callback(
      tasks ? tasks.split("||").map((task, i) => ({ key: i.toString(), text: task, done: false })) : []
    );
  },
  convertToStringWithSeparators(tasks) {
    return tasks.map(task => task.text).join("||");
  },
  all(callback) {
    return AsyncStorage.getItem("TASKS", (err, tasks) =>
      this.convertToArrayOfObject(tasks, callback)
    );
  },
  save(tasks) {
    AsyncStorage.setItem("TASKS", this.convertToStringWithSeparators(tasks));
  }
};

let DoneTasks = {
  convertToArrayOfObject(tasks, callback) {
    return callback(
      tasks ? tasks.split("||").map((task, i) => ({ key: 'saved_done' + i.toString(), text: task, done: true })) : []
    );
  },
  convertToStringWithSeparators(tasks) {
    return tasks.map(task => task.text).join("||");
  },
  all(callback) {
    return AsyncStorage.getItem("DONE_TASKS", (err, tasks) =>
      this.convertToArrayOfObject(tasks, callback)
    );
  },
  save(tasks) {
    AsyncStorage.setItem("DONE_TASKS", this.convertToStringWithSeparators(tasks));
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
