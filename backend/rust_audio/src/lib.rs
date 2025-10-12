use pyo3::prelude::*;
use std::fs::File;

#[pyfunction]
fn validate_audio_file(path: String) -> PyResult<(f64, u32, u32)> {
    let file = File::open(&path).map_err(|e| {
        PyErr::new::<pyo3::exceptions::PyIOError, _>(format!("Failed to open file: {}", e))
    })?;
    
    let mut hint = symphonia::core::probe::Hint::new();
    if let Some(ext) = std::path::Path::new(&path).extension() {
        hint.with_extension(ext.to_str().unwrap_or(""));
    }
    
    let mss = symphonia::core::io::MediaSourceStream::new(Box::new(file), Default::default());
    
    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &Default::default(), &Default::default())
        .map_err(|e| PyErr::new::<pyo3::exceptions::PyValueError, _>(format!("Invalid audio format: {}", e)))?;
    
    let track = probed.format.default_track()
        .ok_or_else(|| PyErr::new::<pyo3::exceptions::PyValueError, _>("No audio track found"))?;
    
    let sample_rate = track.codec_params.sample_rate.unwrap_or(0);
    let channels = track.codec_params.channels.map(|c| c.count()).unwrap_or(0) as u32;
    
    let duration = if let Some(n_frames) = track.codec_params.n_frames {
        n_frames as f64 / sample_rate as f64
    } else {
        0.0
    };
    
    Ok((duration, sample_rate, channels))
}

#[pymodule]
fn rust_audio(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(validate_audio_file, m)?)?;
    Ok(())
}
