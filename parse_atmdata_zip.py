import zipfile
from pathlib import Path
import pandas as pd
import logging
from datetime import datetime


def parse_atmdata_zip(zip_dir, h5_fname):

    zip_dir = Path(zip_dir)
    
    # Open HDF5 store to wride data
    with pd.HDFStore(h5_fname, mode='w') as store:
        for zip_path in zip_dir.glob('*.zip'):
            with zipfile.ZipFile(zip_path, 'r') as zf:
                for file_info in zf.infolist():
                    # Skip directories and non-CSV files
                    if file_info.is_dir() or not file_info.filename.endswith('.csv'):
                        continue
    
                    # Read CSV content
                    with zf.open(file_info.filename) as f:
                        try:
                            df = pd.read_csv(f, sep=';')

                            # add timestamp column
                            df['timestamp'] = df.apply(lambda row: datetime(year=row.ANO, month=row.MES, day=row.DIA).isoformat(), axis=1)
                        except Exception as e:
                            logging.error(f"Failed to read {file_info.filename} in {zip_path.name}: {e}")
                            continue
    
                    # Normalize dataset names
                    # ex: data1.zip with internal folder/f1/data.csv → /data1/f1_data
                    zip_name = zip_path.stem
                    zip_name = 'y'+zip_name[4:8]
                    internal_path = Path(file_info.filename)
                    flat_name = internal_path.with_suffix('').parts[-1]
                    dataset_name = f"/{zip_name}/{flat_name}"
    
                    # Store in HDF5
                    store.put(dataset_name, df, format='table')
                    logging.info(f"Stored {file_info.filename} as {dataset_name}")
    
    return h5_fname


if __name__=='__main__':
    parse_atmdata_zip('data', 'air_quality.h5')
