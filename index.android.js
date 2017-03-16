import React, {Component} from 'react';
import {
    AppRegistry,
    StyleSheet,
    Dimensions,
    Text,
    View,
    TouchableOpacity,
    ListView,
    ActivityIndicator,
} from 'react-native';

import Camera from 'react-native-camera';
import Icon from 'react-native-vector-icons/FontAwesome';
import Modal from 'react-native-modalbox';
import Button from 'react-native-button';
var StatusBarAndroid = require('react-native-android-statusbar');

// Loading my api keys from external file ./apiKeys.json
const apiKeys = require('./apiKeys.json');
const yandexKey = apiKeys.yandexTranslateKey;

const yandexGetLang = `https://translate.yandex.net/api/v1.5/tr.json/getLangs?key=${yandexKey}&ui=en`
const yandexGetTranslate = `https://translate.yandex.net/api/v1.5/tr.json/translate?key=${yandexKey}`

const Clarifai = require('clarifai');

var app = new Clarifai.App(
    apiKeys.clarifaiID,
    apiKeys.clarifaiSecret,
);

const whiteColor = '#E8EAF6CC';
const transparent = '#00000000';

export default class what_the_thing extends Component {

    constructor(props) {
    super();

    const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

    this.state = {
        loadingVisible: false,
        concepts: '',
        lnconcept: '',
        lang: 'hi',
        langs: [],
        isOpen: false,
        // isDisabled: false,
        swipeToClose: false,
        dataSource: ds.cloneWithRows([]),
        };

        this.toggleLoader = this.toggleLoader.bind(this);
        this.setTextContent = this.setTextContent.bind(this);
        this.loadConcept = this.loadConcept.bind(this);
        this.emptyState = this.emptyState.bind(this);
        this.translateConcept = this.translateConcept.bind(this);
        this.loadLnConcept = this.loadLnConcept.bind(this);
        this.getlangList = this.getlangList.bind(this);
        this.conceptCleanup = this.conceptCleanup.bind(this);
        this.loadOtherConcept = this.loadOtherConcept.bind(this);
        this.setLang = this.setLang.bind(this);
    }


    componentWillMount() {
        this.getlangList();
        // StatusBarAndroid.hideStatusBar();
        StatusBarAndroid.setHexColor('#757575');
    }


    toggleLoader() {
        this.setState({
            loadingVisible: !this.state.loadingVisible
        });
    }


    emptyState() {
        this.setState({
            concepts: '',
            lnconcept: '',
        });
    }


    setLang(key) {
        this.setState({lang:key});
        this.refs.langs.close();
    }


    getlangList() {

        fetch(yandexGetLang)
        .then(res => res.json())
        .then(data => {
            this.setState({
                dataSource: this.state.dataSource.cloneWithRows(data.langs)
            })
        })
        .catch(err => alert(err));
    }


    setTextContent(concepts) {
        this.setState({
            concepts: concepts,
        });
    }


    loadConcept() {
        const concept = this.state.concepts;

        if(concept!='')
            return (<Text> {concept[0]['name']}{'\n'}</Text>);
        else
            return ''
    }


    loadOtherConcept() {
        const C = this.state.concepts;

        if(C!='')
        return (
            `${C[1]['name']}: ${C[1]['val']}, ${C[2]['name']}: ${C[2]['val']}, ${C[3]['name']}: ${C[3]['val']}`
        );
        else
            return ''
    }


    loadLnConcept() {
        return this.state.lnconcept;
    }


    translateConcept(concept) {

        fetch(`${yandexGetTranslate}&text=${concept}&lang=${this.state.lang}`)
        .then(res => res.json())
        .then(data => {
            this.setState({
                lnconcept: data.text[0]
            })
            this.toggleLoader();
        })
        .catch(err => alert(err));
    }


    conceptCleanup(concepts) {
        return concepts.map((concept) => {
            concept.val = concept.val.toString().match(/^-?\d+(?:\.\d{0,2})?/)[0]
            if(!(concept.name.startsWith('no ')))
                return ({name:concept.name, val: concept.val});
            }
        )
    }


    takePicture() {

        const self = this;
        self.emptyState();
        self.toggleLoader();

        this.camera.capture()
            .then((image64) => {
                app.models.predict(Clarifai.GENERAL_MODEL, {base64: image64.data})
                .then(function(response) {
                    const concepts = (response.outputs[0].data.concepts.slice(0,10))
                    .map(concept => ({name:concept.name, val: concept.value}));

                    // console.table(concepts);
                    //TODO: gota cleanup concepts first
                    const cleanConcept = self.conceptCleanup(concepts);
                    // console.table(cleanConcept);
                    conceptToTanslate = cleanConcept[0]['name'];
                    self.translateConcept(conceptToTanslate);
                    self.setTextContent(concepts);

                    }, function(err) {
                        alert(err);
                    });
            })
            .catch(err => alert(err));
    }


    render() {
        return (
            <View style={styles.container}>
                <Camera ref={(cam) => {
                    this.camera = cam;
                }}
                style={styles.preview}
                aspect={Camera.constants.Aspect.fill}
                type={Camera.constants.Type.back}
                captureMode={Camera.constants.CaptureMode.still}
                captureTarget={Camera.constants.CaptureTarget.memory}
                captureQuality={Camera.constants.CaptureQuality.low}
                playSoundOnCapture={true}
                >
                    <View style={[styles.topIcons,]}>
                        <View style={[styles.info]}>
                            <TouchableOpacity>
                                <Icon name="question-circle-o" size={50}
                                color={this.state.loadingVisible?transparent:whiteColor}
                            />
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.lang]}>
                            <TouchableOpacity onPress={() => {this.toggleLoader(); this.refs.langs.open();}}>
                                <Icon name="gear" size={50}
                                color={this.state.loadingVisible?transparent:whiteColor}
                            />
                            </TouchableOpacity>
                        </View>
                    </View>


                    <View style={styles.Concept}>
                        <Text style={styles.enConceptText}>
                            {this.loadLnConcept()}
                        </Text>
                    </View>

                    <View style={[{ flex: 1 },]}>
                        <ActivityIndicator
                            animating={this.state.loadingVisible}
                            style={[styles.activityIcon,]}
                            size="large"
                            // color="white"
                        />
                    </View>

                    <View style={styles.Concept}>
                        <Text style={styles.lnConceptText}>
                            {this.loadConcept()}
                        </Text>
                    </View>
                    <View style={{top: 18}}>
                        <Text style={[styles.lnConceptText,]}>
                            <Text style={{fontSize:14}}> {this.loadOtherConcept()}</Text>
                        </Text>
                    </View>

                    <View style={[{height:70}]}>
                        <TouchableOpacity
                            style={[styles.cameraIco,{height:this.state.loadingVisible?0:72}]}
                            onPress={this.takePicture.bind(this)}>
                            <View>
                                <Icon name="eercast" size={70}
                                color={this.state.loadingVisible?transparent:whiteColor}
                                />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* TODO: optimize modal */}

                    <Modal
                        style={[styles.modal, styles.langs]}
                        position={"center"}
                        ref={"langs"}
                        // isDisabled={this.state.isDisabled}
                        swipeToClose={this.state.swipeToClose}
                        // onOpened={this.onLangOpen}
                        onClosed={this.toggleLoader}
                        >
                        <ListView
                            dataSource={this.state.dataSource}
                            renderRow={(rowData, sectionID, rowID) =>
                                <View style={styles.listBoxes}>
                                    <TouchableOpacity
                                        onPress={this.setLang.bind(this, rowID)}>
                                        <Text style={styles.list}>
                                                {rowData}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                        }/>

                    </Modal>

                </Camera>
            </View>
        );
    }
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
    },

    activityIcon: {
        alignItems: 'center',
        justifyContent: 'center',
        top: Dimensions.get('window').height/7,
    },

    preview: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        height: Dimensions.get('window').height,
        width: Dimensions.get('window').width,
    },

    cameraIco: {
        bottom: 20,
    },

    topIcons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        top: 10,
    },

    info: {
        flex: 1,
        left: 12,
        alignItems: 'flex-start',
    },

    lang: {
        flex: 1,
        right: 12,
        alignItems: 'flex-end',
    },

    modal: {
        justifyContent: 'center',
        alignItems: 'center',
    },

    langs: {
        height: Dimensions.get('window').height - 120,
        width: Dimensions.get('window').width - 80,
        paddingBottom: 10,
    },

    langListView: {
        justifyContent: 'center',
        alignItems: 'center',
    },

    langList: {
        width: Dimensions.get('window').width - 80,
        // paddingLeft: 50,
        paddingTop: 4,
        paddingBottom: 10,
    },

    listBoxes: {
        borderBottomWidth: 1,
        borderBottomColor: '#CFD8DC',
        width: Dimensions.get('window').width - 100,
        justifyContent: 'center',
        alignItems: 'center',
    },

    list: {
        fontSize: 20,
        paddingTop: 8,
        paddingBottom: 2,
    },

    Concept: {
        flex: 1,
        top: Dimensions.get('window').height/5.5,
        alignItems: 'center',
    },

    enConceptText: {
        fontSize: 40,
        color: 'white',
        top: 0,
    },

    lnConceptText: {
        bottom: Dimensions.get('window').height/8,
        fontSize: 35,
        color: 'white',
    }
});

AppRegistry.registerComponent('what_the_thing', () => what_the_thing);
