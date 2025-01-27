import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import FaArrowLeft from '@expo/vector-icons/FontAwesome5';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createSpace, fetchUserById} from '../api';

const generateDurations = (): {label: string; value: number}[] => {
  const durations: {label: string; value: number}[] = [];
  const msPerMin = 60000;
  for (let m = 15; m <= 180; m += 15) {
    durations.push({label: `${m} min`, value: m * msPerMin});
  }
  for (let h = 4; h <= 6; h++) {
    durations.push({label: `${h} hr`, value: h * 60 * msPerMin});
  }
  return durations;
};

const CreateSpace: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('25');
  const [askToSpeak, setAskToSpeak] = useState(false);
  const [askToJoin, setAskToJoin] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [error, setError] = useState('');
  const [duration, setDuration] = useState<number>(15 * 60 * 1000);
  const router = useRouter();
  const durations = useMemo(() => generateDurations(), []);

  const handleCreate = async () => {
    const currentUserId = await AsyncStorage.getItem('currentUserId');
    if (!currentUserId) {
      router.replace({ pathname: '/welcome' });
      return;
    }
    const currentUser = await fetchUserById(currentUserId);
    if (!currentUser) {
      return;
    }

    let startTimestamp = Date.now();
    if (startTime) {
      const chosenTime = startTime.getTime();
      const diff = chosenTime - Date.now();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      if (diff > threeDaysMs || diff < 0) {
        setError(
          'Scheduled time must be within the next 3 days, and not in the past.',
        );
        return;
      }
      startTimestamp = chosenTime;
    }

    // Validation
    if (title.trim().length < 3) {
      setError('Title must be at least 3 characters');
      return;
    }
    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters');
      return;
    }

    try {
      const newSpace = await createSpace(title, description, currentUser, {
        capacity: parseInt(capacity, 10),
        askToSpeak,
        askToJoin,
        startTime: startTimestamp,
        duration,
      });
      router.replace({ pathname: '/space/[spaceId]', params: {spaceId: newSpace.id} });
    } catch (err) {
      console.error(err);
      setError('Failed to create space. Please try again.');
    }
  };

  React.useEffect(() => {
    const timeout = setTimeout(() => setError(''), 3000);
    return () => clearTimeout(timeout);
  }, [error]);

  // Show picker for Android
  const showAndroidDatePicker = () => {
    DateTimePickerAndroid.open({
      value: startTime || new Date(),
      onChange: onDateChange,
      mode: 'date',
      is24Hour: true,
      maximumDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      minimumDate: new Date(),
    });
  };

  // Function to show time picker after date is selected
  const showAndroidTimePicker = (selectedDate: Date) => {
    DateTimePickerAndroid.open({
      value: selectedDate,
      onChange: onTimeChange,
      mode: 'time',
      is24Hour: true,
    });
  };

  // Handle date selection
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      return;
    }
    if (selectedDate) {
      // Show time picker after date is selected
      showAndroidTimePicker(selectedDate);
    }
  };

  // Handle time selection
  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (event.type === 'dismissed') {
      return;
    }
    if (selectedTime) {
      setStartTime(selectedTime);
    }
  };

  const onChangeStartTime = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowStartTimePicker(false); // Close picker when dismissed
      return;
    }
    setShowStartTimePicker(Platform.OS === 'ios'); // Keep open for iOS
    if (selectedDate) {
      setStartTime(selectedDate); // Update the start time
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace({ pathname: '/' })}>
          <FaArrowLeft name="arrow-left" style={styles.icon} />
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create a New Space</Text>
      </View>

      {/* Form Container */}
      <View style={styles.formContainer}>
        {/* Error Message */}
        {error !== '' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Title Input */}
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={text => setTitle(text)}
          placeholder="e.g., Evening Discussion"
        />

        {/* Description Input */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={text => setDescription(text)}
          placeholder="Describe your space..."
          multiline
          numberOfLines={4}
        />

        {/* Capacity Input */}
        <Text style={styles.label}>Capacity</Text>
        <TextInput
          style={styles.input}
          value={capacity}
          onChangeText={text => setCapacity(text)}
          placeholder="e.g., 25"
          keyboardType="number-pad"
        />

        {/* Ask to Speak Checkbox */}
        <View style={styles.checkboxGroup}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setAskToSpeak(!askToSpeak)}>
            <View
              style={[styles.checkboxBox, askToSpeak && styles.checkboxChecked]}
            />
            <Text style={styles.checkboxLabel}>Ask to Speak</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.separator} />

        {/* Ask to Join Checkbox */}
        <View style={styles.checkboxGroup}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setAskToJoin(!askToJoin)}>
            <View
              style={[styles.checkboxBox, askToJoin && styles.checkboxChecked]}
            />
            <Text style={styles.checkboxLabel}>Ask to Join</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.separator} />

        {/* Start Time Picker */}
        <View style={styles.dateTimeContainer}>
          <Text style={styles.label}>Start Time (optional)</Text>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={
              () =>
                Platform.OS === 'web' ? setError('Not supported on web') :
                Platform.OS === 'android'
                  ? showAndroidDatePicker() // Start with the date picker
                  : setShowStartTimePicker(true) // Show the full picker for iOS
            }>
            <Text style={styles.dateTimeText}>
              {startTime ? startTime.toLocaleString() : 'Select Start Time'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>
            Leave blank for immediate start. Must be within next 3 days.
          </Text>
          {showStartTimePicker && Platform.OS !== 'android' && (
            <DateTimePicker
              value={startTime || new Date()}
              mode="datetime"
              display="default"
              onChange={onChangeStartTime}
              maximumDate={new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)}
              minimumDate={new Date()}
            />
          )}
        </View>
        <View style={styles.separator} />

        {/* Duration Picker */}
        <View style={styles.durationContainer}>
          <Text style={styles.label}>Duration</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={duration}
              onValueChange={itemValue => setDuration(itemValue)}
              style={styles.picker}
              itemStyle={styles.pickerItem}>
              {durations.map(d => (
                <Picker.Item key={d.value} label={d.label} value={d.value} />
              ))}
            </Picker>
          </View>
          <Text style={styles.helperText}>
            Choose how long the space will run before automatically ending.
          </Text>
        </View>
        <View style={styles.separator} />

        {/* Create Space Button */}
        <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
          <Text style={styles.createButtonText}>Create Space</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f7f9f9',
    flexGrow: 1,
    width: '100%',
    maxWidth: 600,
    justifyContent: 'center',
    marginHorizontal: 'auto',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: '#1da1f2',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    cursor: 'pointer',
  },
  icon: {
    fontSize: 16,
    color: '#1da1f2',
    marginRight: 5,
  },
  buttonText: {
    color: '#1da1f2',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  input: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  checkboxGroup: {
    marginBottom: 15,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#1da1f2',
    borderColor: '#1da1f2',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 15,
  },
  dateTimeContainer: {
    marginBottom: 15,
  },
  dateTimeButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#555',
  },
  helperText: {
    fontSize: 12,
    color: '#555',
    marginTop: 5,
  },
  durationContainer: {
    marginBottom: 15,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  pickerItem: {
    height: 50,
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#1da1f2',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#ffe6e6',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  errorText: {
    color: '#d93025',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default CreateSpace;
