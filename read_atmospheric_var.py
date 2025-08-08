import pandas as pd
from datetime import datetime


month_num = {1:'ene', 2:'feb', 3:'mar', 4:'abr', 5:'may', 6:'jun', 7:'jul', 8:'ago', 9:'sep', 10:'oct', 11:'nov', 12:'dic'}

def get_points_df(year, month, day, hour, var, airquality_hdf, estaciones_xls='informacion_estaciones_red_calidad_aire.xls'):

    estaciones = pd.read_excel(estaciones_xls)
    estaciones_dict = {n.CODIGO_CORTO:[n.LONGITUD, n.LATITUD] for i,n in estaciones.iterrows()}
    
    points_df = pd.DataFrame(columns=['sta','lon','lat', 'z'])
                                      #'H01','H02','H03','H04','H05','H06','H06','H07','H08','H09',
                                      #'H10','H11','H12','H12','H13','H14','H15','H16','H17','H18','H19','H20',
                                      #'H21','H22','H23','H24'])
    timestamp = datetime(year=year, month=month, day=day).isoformat()
    df_label = '/y{}/{}_mo{}'.format(year, month_num[month], str(year)[-2:])


    with pd.HDFStore(airquality_hdf, mode='r') as store:
        df = store.get(df_label)
    
    df_f = df[(df['timestamp']==timestamp) & (df['MAGNITUD']==var)].loc[:, ['ESTACION', 'H{:02.0f}'.format(hour)]]

    points_df['sta'] = df_f['ESTACION']
    points_df['z'] = df_f['H{:02.0f}'.format(hour)]

    points_df['lon'] = points_df.apply(lambda row: estaciones_dict[row.sta][0], axis=1)
    points_df['lat'] = points_df.apply(lambda row: estaciones_dict[row.sta][1], axis=1)
    
    # points_df.loc[:,['sta', 'z'] ]
    return points_df  