import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type PickerProps = {
  visible: boolean;
  target: "from" | "to";
  selectedDate: string;
  minimumDate: string;
  maximumDate: string;
  onClose: () => void;
  onSelect: (date: Date) => void;
};

const MONTHS = Array.from({ length: 12 }, (_, month) => month);
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function CustomDateRangePicker({
  visible,
  target,
  selectedDate,
  minimumDate,
  maximumDate,
  onClose,
  onSelect,
}: PickerProps) {
  const minimum = useMemo(
    () => parseLocalDate(minimumDate) ?? new Date(1900, 0, 1),
    [minimumDate],
  );
  const maximum = useMemo(
    () => parseLocalDate(maximumDate) ?? new Date(),
    [maximumDate],
  );
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const selected = parseLocalDate(selectedDate) ?? maximum;
    return new Date(selected.getFullYear(), selected.getMonth(), 1);
  });
  const [openDropdown, setOpenDropdown] = useState<"month" | "year" | null>(
    null,
  );

  useEffect(() => {
    if (!visible) return;
    const selected = parseLocalDate(selectedDate) ?? maximum;
    setCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    setOpenDropdown(null);
  }, [visible, selectedDate, maximum]);

  const firstMonth = new Date(minimum.getFullYear(), minimum.getMonth(), 1);
  const lastMonth = new Date(maximum.getFullYear(), maximum.getMonth(), 1);
  const monthAllowed = (year: number, month: number) => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return end >= minimum && start <= maximum;
  };
  const selected = parseLocalDate(selectedDate);
  const yearOptions = Array.from(
    { length: Math.max(0, maximum.getFullYear() - minimum.getFullYear() + 1) },
    (_, index) => minimum.getFullYear() + index,
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>
              {`Select ${target === "from" ? "From" : "To"} Date`}
            </Text>
            <Pressable onPress={onClose} accessibilityLabel="Close date picker">
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>

          <View style={styles.dropdownRow}>
            <Pressable
              onPress={() =>
                setOpenDropdown(openDropdown === "month" ? null : "month")
              }
              style={styles.dropdown}
              accessibilityRole="button"
              accessibilityLabel="Choose month"
            >
              <Text style={styles.dropdownLabel}>Month</Text>
              <Text style={styles.dropdownValue}>
                {calendarMonth.toLocaleDateString("en-US", { month: "long" })} ▾
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                setOpenDropdown(openDropdown === "year" ? null : "year")
              }
              style={styles.dropdown}
              accessibilityRole="button"
              accessibilityLabel="Choose year"
            >
              <Text style={styles.dropdownLabel}>Year</Text>
              <Text style={styles.dropdownValue}>
                {calendarMonth.getFullYear()} ▾
              </Text>
            </Pressable>
          </View>

          {openDropdown === "month" && (
            <View style={styles.monthOptions}>
              {MONTHS.map((month) => {
                const disabled = !monthAllowed(
                  calendarMonth.getFullYear(),
                  month,
                );
                const active = calendarMonth.getMonth() === month;
                return (
                  <Pressable
                    key={month}
                    disabled={disabled}
                    onPress={() => {
                      setCalendarMonth(
                        new Date(calendarMonth.getFullYear(), month, 1),
                      );
                      setOpenDropdown(null);
                    }}
                    style={[
                      styles.monthOption,
                      active && styles.optionSelected,
                      disabled && styles.optionDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        active && styles.optionTextSelected,
                        disabled && styles.optionTextDisabled,
                      ]}
                    >
                      {new Date(calendarMonth.getFullYear(), month, 1)
                        .toLocaleDateString("en-US", { month: "short" })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {openDropdown === "year" && (
            <ScrollView
              style={styles.yearOptions}
              contentContainerStyle={styles.yearOptionsContent}
              keyboardShouldPersistTaps="handled"
            >
              {yearOptions.map((year) => (
                <Pressable
                  key={year}
                  onPress={() => {
                    const month = calendarMonth.getMonth();
                    const nextMonth = monthAllowed(year, month)
                      ? month
                      : year === minimum.getFullYear()
                        ? minimum.getMonth()
                        : year === maximum.getFullYear()
                          ? maximum.getMonth()
                          : month;
                    setCalendarMonth(new Date(year, nextMonth, 1));
                    setOpenDropdown(null);
                  }}
                  style={[
                    styles.yearOption,
                    calendarMonth.getFullYear() === year &&
                      styles.optionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      calendarMonth.getFullYear() === year &&
                        styles.optionTextSelected,
                    ]}
                  >
                    {year}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={styles.calendarHeader}>
            <Pressable
              onPress={() =>
                setCalendarMonth(
                  new Date(
                    calendarMonth.getFullYear(),
                    calendarMonth.getMonth() - 1,
                    1,
                  ),
                )
              }
              disabled={calendarMonth <= firstMonth}
              style={styles.arrowButton}
              accessibilityLabel="Previous month"
            >
              <Text style={styles.arrow}>‹</Text>
            </Pressable>
            <Text style={styles.calendarTitle}>
              {calendarMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </Text>
            <Pressable
              onPress={() =>
                setCalendarMonth(
                  new Date(
                    calendarMonth.getFullYear(),
                    calendarMonth.getMonth() + 1,
                    1,
                  ),
                )
              }
              disabled={calendarMonth >= lastMonth}
              style={styles.arrowButton}
              accessibilityLabel="Next month"
            >
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          </View>

          <View style={styles.calendarGrid}>
            {WEEKDAYS.map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.weekday}>
                {day}
              </Text>
            ))}
            {Array.from(
              {
                length: new Date(
                  calendarMonth.getFullYear(),
                  calendarMonth.getMonth(),
                  1,
                ).getDay(),
              },
              (_, index) => <View key={`blank-${index}`} style={styles.blank} />,
            )}
            {Array.from(
              {
                length: new Date(
                  calendarMonth.getFullYear(),
                  calendarMonth.getMonth() + 1,
                  0,
                ).getDate(),
              },
              (_, index) => {
                const date = new Date(
                  calendarMonth.getFullYear(),
                  calendarMonth.getMonth(),
                  index + 1,
                );
                const dateValue = formatDate(date);
                const disabled = date < minimum || date > maximum;
                const isSelected = selectedDate === dateValue;
                return (
                  <Pressable
                    key={dateValue}
                    disabled={disabled}
                    onPress={() => onSelect(date)}
                    style={[
                      styles.day,
                      isSelected && styles.daySelected,
                      disabled && styles.dayDisabled,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={date.toLocaleDateString("en-US", {
                      dateStyle: "full",
                    })}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        disabled && styles.dayTextDisabled,
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(12,30,21,0.48)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    width: "100%",
    maxWidth: 390,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "white",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { color: "#17352B", fontSize: 16, fontWeight: "800" },
  close: { color: "#53655B", fontSize: 24, paddingHorizontal: 4 },
  dropdownRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  dropdown: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DCE7DF",
    borderRadius: 11,
    paddingHorizontal: 10,
  },
  dropdownLabel: { color: "#748078", fontSize: 10, fontWeight: "600" },
  dropdownValue: {
    color: "#17352B",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  monthOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 10,
  },
  monthOption: {
    width: "23%",
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: "#F4F7F4",
  },
  yearOptions: { maxHeight: 160, marginBottom: 10 },
  yearOptionsContent: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  yearOption: {
    minWidth: 66,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: "#F4F7F4",
  },
  optionSelected: { backgroundColor: "#D7F2E4" },
  optionDisabled: { backgroundColor: "#F8FAFC" },
  optionText: { color: "#1E3A2F", fontSize: 12, fontWeight: "600" },
  optionTextSelected: { color: "#176B45", fontWeight: "800" },
  optionTextDisabled: { color: "#CBD5E1" },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  arrowButton: {
    width: 38,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: { color: "#176B45", fontSize: 26 },
  calendarTitle: {
    color: "#17352B",
    fontSize: 14,
    fontWeight: "800",
  },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: {
    width: "14.2857%",
    paddingVertical: 6,
    color: "#748078",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  blank: { width: "14.2857%", height: 40 },
  day: {
    width: "14.2857%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  daySelected: { backgroundColor: "#176B45" },
  dayDisabled: { opacity: 0.35 },
  dayText: { color: "#17352B", fontSize: 12, fontWeight: "600" },
  dayTextSelected: { color: "white", fontWeight: "800" },
  dayTextDisabled: { color: "#9CA3AF" },
});
