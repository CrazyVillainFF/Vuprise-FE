import React, { useEffect, useMemo, useState } from 'react';
import { Autocomplete, Stack, TextField } from '@mui/material';

const CountryRegionSelector = ({ value, onChange, disabled = false, required = true }) => {
  const [countryQuery, setCountryQuery] = useState('');
  const [regionQuery, setRegionQuery] = useState('');
  const [catalog, setCatalog] = useState({ countries: [], getRegionsForCountry: () => [] });
  const [catalogReady, setCatalogReady] = useState(false);
  useEffect(() => {
    let active = true;
    import('../utils/locationCatalog.js').then(({ COUNTRIES, getRegionsForCountry }) => {
      if (active) {
        setCatalog({ countries: COUNTRIES, getRegionsForCountry });
        setCatalogReady(true);
      }
    });
    return () => { active = false; };
  }, []);
  const { countries, getRegionsForCountry } = catalog;
  const country = countries.find((item) => item.code === value.countryCode) || null;
  const regions = useMemo(() => getRegionsForCountry(value.countryCode), [value.countryCode]);
  const region = regions.find((item) => item.code === value.regionCode) || null;
  const manualRegion = !regions.length && value.region ? value.region : null;

  const selectCountry = (_event, selected) => {
    setCountryQuery('');
    setRegionQuery('');
    onChange({
      country: selected?.name || '',
      countryCode: selected?.code || '',
      region: '',
      regionCode: '',
    });
  };

  const selectRegion = (_event, selected) => {
    setRegionQuery('');
    const selectedRegion = typeof selected === 'string' ? selected.trim() : selected?.name || '';
    onChange({
      ...value,
      region: selectedRegion,
      regionCode: typeof selected === 'object' && selected ? selected.code : '',
    });
  };

  return (
    <Stack spacing={2}>
      <Autocomplete
        options={countries}
        value={country}
        inputValue={countryQuery || country?.name || ''}
        onInputChange={(_event, query, reason) => setCountryQuery(reason === 'input' ? query : '')}
        onChange={selectCountry}
        getOptionLabel={(option) => option?.name || ''}
        isOptionEqualToValue={(option, selected) => option.code === selected.code}
        filterOptions={(options, { inputValue }) => {
          const query = inputValue.trim().toLocaleLowerCase();
          return query ? options.filter((option) => option.name.toLocaleLowerCase().includes(query)) : options;
        }}
        disabled={disabled || !catalogReady}
        loading={!catalogReady}
        loadingText="Loading countries…"
        autoHighlight
        renderInput={(params) => (
          <TextField {...params} label="Country" required={required} slotProps={{ ...params.slotProps, htmlInput: { ...params.slotProps?.htmlInput, autoComplete: 'country-name' } }} />
        )}
      />

      <Autocomplete
        options={regions}
        value={region || manualRegion}
        inputValue={regionQuery || region?.name || manualRegion || ''}
        onInputChange={(_event, query, reason) => {
          setRegionQuery(reason === 'input' ? query : '');
          if (!regions.length && reason === 'input') onChange({ ...value, region: query, regionCode: '' });
        }}
        onChange={selectRegion}
        getOptionLabel={(option) => typeof option === 'string' ? option : option?.name || ''}
        isOptionEqualToValue={(option, selected) => option.code === selected.code}
        filterOptions={(options, { inputValue }) => {
          const query = inputValue.trim().toLocaleLowerCase();
          return query ? options.filter((option) => option.name.toLocaleLowerCase().includes(query)) : options;
        }}
        disabled={disabled || !country}
        autoHighlight
        freeSolo={!regions.length}
        noOptionsText={regions.length ? 'No regions match that search' : 'No regions are listed. Enter your region name.'}
        renderInput={(params) => (
          <TextField
            {...params}
            label="State / Province / Region"
            required={required}
            helperText={country && !regions.length ? 'This country has no region list in our dataset. Enter your region name.' : undefined}
            slotProps={{ ...params.slotProps, htmlInput: { ...params.slotProps?.htmlInput, autoComplete: 'address-level1' } }}
          />
        )}
      />
    </Stack>
  );
};

export default CountryRegionSelector;
