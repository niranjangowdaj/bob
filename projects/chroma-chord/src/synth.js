import * as Tone from 'tone';

let synth;
let reverb;

export const initSynth = async () => {
  await Tone.start();

  reverb = new Tone.Reverb({
    decay: 4,
    wet: 0.5
  }).toDestination();

  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: "triangle8"
    },
    envelope: {
      attack: 0.5,
      decay: 0.2,
      sustain: 0.7,
      release: 3
    }
  }).connect(reverb);
  
  synth.volume.value = -10;
};

export const setOscillatorFrequency = (hexColor, index) => {
  if (!synth) return;

  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  const brightness = (r + g + b) / 3;
  const frequency = 110 + (brightness * 2);

  const notes = ["C3", "E3", "G3", "A3", "C4", "D4"];
  const note = notes[index % notes.length];

  synth.triggerAttackRelease(note, "4n");
};