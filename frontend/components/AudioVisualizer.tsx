import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import AudioProvider from "./AudioManager";

const FFT_SIZE = 512;

export default function SkiaVisualizer({ isPlaying }: { isPlaying: boolean }) {
  const size = useSharedValue({ width: 0, height: 0 });
  const waveformPath = useSharedValue(Skia.Path.Make());
  const spectrumPath = useSharedValue(Skia.Path.Make());

  const timeData = new Uint8Array(FFT_SIZE);
  const freqData = new Uint8Array(FFT_SIZE / 2);

  useEffect(() => {
    let raf: number = 0;

    if (isPlaying) {
      console.log("Analyzer on");
      raf = requestAnimationFrame(loop);
    } else {
      console.info("Analyzer off");
      cancelAnimationFrame(raf);
    }

    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  const loop = () => {
    const analyser = AudioProvider.analyzer;
    if (!analyser) return;

    const { height, width } = size.value;

    analyser.getByteTimeDomainData(timeData);
    analyser.getByteFrequencyData(freqData);

    // -------- Waveform --------
    const wavePath = Skia.Path.Make();
    const slice = width / FFT_SIZE;

    for (let i = 0; i < FFT_SIZE; i++) {
      const x = i * slice;
      const y = (timeData[i] / 255) * height * 0.4;

      if (i === 0) wavePath.moveTo(x, y);
      else wavePath.lineTo(x, y);
    }

    waveformPath.value = wavePath;

    // -------- Spectrum --------
    const specPath = Skia.Path.Make();
    const barWidth = width / (FFT_SIZE / 2);

    for (let i = 0; i < FFT_SIZE / 2; i++) {
      const x = i * barWidth;
      const h = (freqData[i] / 255) * height * 0.6;

      specPath.addRect({
        x,
        y: height - h,
        width: barWidth - 2,
        height: h,
      });
    }

    spectrumPath.value = specPath;

    requestAnimationFrame(loop);
  };

  return (
    <Canvas style={styles.container} onSize={size}>
      <Path path={waveformPath} color="lime" style="stroke" strokeWidth={2} />
      <Path path={spectrumPath} color="cyan" />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
