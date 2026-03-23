import {
  AnalyserNode,
  AudioBuffer,
  AudioBufferSourceNode,
  AudioContext,
} from "react-native-audio-api";

export type ActivePlayer = AudioBufferSourceNode & { id: number };

class AudioProvider {
  public audioContext;
  public playerNode: ActivePlayer | null;
  public audioBuffer: AudioBuffer | null;
  public currentPosition: number;
  private onPositionChangedCallback: (value: number) => void;
  public analyzer: AnalyserNode | null = null;
  public id: number | null = null;
  constructor() {
    this.audioContext = new AudioContext();
    this.playerNode = null;
    this.audioBuffer = null;
    this.currentPosition = 0;
    this.onPositionChangedCallback = () => {};
  }

  public pause() {
    this.playerNode?.stop();
    this.audioContext.suspend();
  }

  public stop() {
    this.playerNode?.stop();
    this.playerNode?.disconnect();
    this.audioContext.close();
  }

  public resume(id: number, newTime?: number) {
    this.createBufferSourceNode(id);
    this.audioContext.resume();
    this.playerNode?.start(0, newTime || this.currentPosition);
    if (newTime) this.currentPosition = newTime;
  }

  public start(id: number) {
    this.createBufferSourceNode(id);
    this.playerNode?.start();
  }

  public updatePosition(position: number) {
    this.currentPosition = position;
  }

  public async setActivePlayer(
    id: number,
    url: string,
    onPositionChangedCallback: (value: number) => void,
  ) {
    if (this.playerNode?.id === id) {
      console.warn("Player already set with id: " + this.playerNode?.id);
      return;
    }
    try {
      if (this.playerNode) this.clearActivePlayer();
      const audioBuffer = await this.audioContext.decodeAudioData(url);
      this.audioBuffer = audioBuffer;
      this.onPositionChangedCallback = onPositionChangedCallback;
    } catch (e) {
      console.warn("Error setting new active player:", e);
      throw e;
    }
  }

  private createBufferSourceNode(id: number) {
    const playerNode = this.audioContext.createBufferSource();
    playerNode.buffer = this.audioBuffer;
    const analyzer = this.createAnalyser();
    playerNode.connect(analyzer);
    playerNode.onPositionChanged = (ev) => {
      this.currentPosition = ev.value;
      this.onPositionChangedCallback(ev.value);
    };
    playerNode.onPositionChangedInterval = 100;
    (playerNode as ActivePlayer).id = id;
    this.playerNode = playerNode as ActivePlayer;
  }

  public clearActivePlayer() {
    console.log("Clearing active player...");
    this.stop();
    this.playerNode = null;
  }

  private createAnalyser() {
    const analyzer = this.audioContext.createAnalyser();
    analyzer.fftSize = 512;
    analyzer.smoothingTimeConstant = 0.8;
    analyzer.connect(this.audioContext.destination);
    this.analyzer = analyzer;
    return analyzer;
  }
}

export default new AudioProvider();
