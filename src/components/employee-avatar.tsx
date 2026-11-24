import { useEffect, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";

const AVATAR_ASSETS: Record<string, ImageSourcePropType> = {
  "assets/avatars/avatar-001.png": require("@/assets/avatars/avatar-001.png"),
  "assets/avatars/avatar-002.png": require("@/assets/avatars/avatar-002.png"),
  "assets/avatars/avatar-003.png": require("@/assets/avatars/avatar-003.png"),
  "assets/avatars/avatar-004.png": require("@/assets/avatars/avatar-004.png"),
  "assets/avatars/avatar-005.png": require("@/assets/avatars/avatar-005.png"),
  "assets/avatars/avatar-006.png": require("@/assets/avatars/avatar-006.png"),
  "assets/avatars/avatar-007.png": require("@/assets/avatars/avatar-007.png"),
  "assets/avatars/avatar-008.png": require("@/assets/avatars/avatar-008.png"),
  "assets/avatars/avatar-009.png": require("@/assets/avatars/avatar-009.png"),
  "assets/avatars/avatar-010.png": require("@/assets/avatars/avatar-010.png"),
  "assets/avatars/avatar-011.png": require("@/assets/avatars/avatar-011.png"),
  "assets/avatars/avatar-012.png": require("@/assets/avatars/avatar-012.png"),
  "assets/avatars/avatar-013.png": require("@/assets/avatars/avatar-013.png"),
  "assets/avatars/avatar-014.png": require("@/assets/avatars/avatar-014.png"),
  "assets/avatars/avatar-015.png": require("@/assets/avatars/avatar-015.png"),
  "assets/avatars/avatar-016.png": require("@/assets/avatars/avatar-016.png"),
  "assets/avatars/avatar-017.png": require("@/assets/avatars/avatar-017.png"),
  "assets/avatars/avatar-018.png": require("@/assets/avatars/avatar-018.png"),
  "assets/avatars/avatar-019.png": require("@/assets/avatars/avatar-019.png"),
  "assets/avatars/avatar-020.png": require("@/assets/avatars/avatar-020.png"),
  "assets/avatars/avatar-021.png": require("@/assets/avatars/avatar-021.png"),
  "assets/avatars/avatar-022.png": require("@/assets/avatars/avatar-022.png"),
  "assets/avatars/avatar-023.png": require("@/assets/avatars/avatar-023.png"),
  "assets/avatars/avatar-024.png": require("@/assets/avatars/avatar-024.png"),
  "assets/avatars/avatar-025.png": require("@/assets/avatars/avatar-025.png"),
  "assets/avatars/avatar-026.png": require("@/assets/avatars/avatar-026.png"),
  "assets/avatars/avatar-027.png": require("@/assets/avatars/avatar-027.png"),
  "assets/avatars/avatar-028.png": require("@/assets/avatars/avatar-028.png"),
  "assets/avatars/avatar-029.png": require("@/assets/avatars/avatar-029.png"),
  "assets/avatars/avatar-030.png": require("@/assets/avatars/avatar-030.png"),
  "assets/avatars/avatar-031.png": require("@/assets/avatars/avatar-031.png"),
  "assets/avatars/avatar-032.png": require("@/assets/avatars/avatar-032.png"),
  "assets/avatars/avatar-033.png": require("@/assets/avatars/avatar-033.png"),
  "assets/avatars/avatar-034.png": require("@/assets/avatars/avatar-034.png"),
  "assets/avatars/avatar-035.png": require("@/assets/avatars/avatar-035.png"),
  "assets/avatars/avatar-036.png": require("@/assets/avatars/avatar-036.png"),
  "assets/avatars/avatar-037.png": require("@/assets/avatars/avatar-037.png"),
  "assets/avatars/avatar-038.png": require("@/assets/avatars/avatar-038.png"),
  "assets/avatars/avatar-039.png": require("@/assets/avatars/avatar-039.png"),
  "assets/avatars/avatar-040.png": require("@/assets/avatars/avatar-040.png"),
  "assets/avatars/avatar-041.png": require("@/assets/avatars/avatar-041.png"),
  "assets/avatars/avatar-042.png": require("@/assets/avatars/avatar-042.png"),
  "assets/avatars/avatar-043.png": require("@/assets/avatars/avatar-043.png"),
  "assets/avatars/avatar-044.png": require("@/assets/avatars/avatar-044.png"),
  "assets/avatars/avatar-045.png": require("@/assets/avatars/avatar-045.png"),
  "assets/avatars/avatar-046.png": require("@/assets/avatars/avatar-046.png"),
  "assets/avatars/avatar-047.png": require("@/assets/avatars/avatar-047.png"),
  "assets/avatars/avatar-048.png": require("@/assets/avatars/avatar-048.png"),
  "assets/avatars/avatar-049.png": require("@/assets/avatars/avatar-049.png"),
  "assets/avatars/avatar-050.png": require("@/assets/avatars/avatar-050.png"),
  "assets/avatars/avatar-051.png": require("@/assets/avatars/avatar-051.png"),
  "assets/avatars/avatar-052.png": require("@/assets/avatars/avatar-052.png"),
  "assets/avatars/avatar-053.png": require("@/assets/avatars/avatar-053.png"),
  "assets/avatars/avatar-054.png": require("@/assets/avatars/avatar-054.png"),
  "assets/avatars/avatar-055.png": require("@/assets/avatars/avatar-055.png"),
  "assets/avatars/avatar-056.png": require("@/assets/avatars/avatar-056.png"),
  "assets/avatars/avatar-057.png": require("@/assets/avatars/avatar-057.png"),
  "assets/avatars/avatar-058.png": require("@/assets/avatars/avatar-058.png"),
  "assets/avatars/avatar-059.png": require("@/assets/avatars/avatar-059.png"),
  "assets/avatars/avatar-060.png": require("@/assets/avatars/avatar-060.png"),
  "assets/avatars/avatar-061.png": require("@/assets/avatars/avatar-061.png"),
  "assets/avatars/avatar-062.png": require("@/assets/avatars/avatar-062.png"),
  "assets/avatars/avatar-063.png": require("@/assets/avatars/avatar-063.png"),
  "assets/avatars/avatar-064.png": require("@/assets/avatars/avatar-064.png"),
  "assets/avatars/avatar-065.png": require("@/assets/avatars/avatar-065.png"),
  "assets/avatars/avatar-066.png": require("@/assets/avatars/avatar-066.png"),
  "assets/avatars/avatar-067.png": require("@/assets/avatars/avatar-067.png"),
  "assets/avatars/avatar-068.png": require("@/assets/avatars/avatar-068.png"),
  "assets/avatars/avatar-069.png": require("@/assets/avatars/avatar-069.png"),
  "assets/avatars/avatar-070.png": require("@/assets/avatars/avatar-070.png"),
  "assets/avatars/avatar-071.png": require("@/assets/avatars/avatar-071.png"),
  "assets/avatars/avatar-072.png": require("@/assets/avatars/avatar-072.png"),
  "assets/avatars/avatar-073.png": require("@/assets/avatars/avatar-073.png"),
  "assets/avatars/avatar-074.png": require("@/assets/avatars/avatar-074.png"),
  "assets/avatars/avatar-075.png": require("@/assets/avatars/avatar-075.png"),
  "assets/avatars/avatar-076.png": require("@/assets/avatars/avatar-076.png"),
  "assets/avatars/avatar-077.png": require("@/assets/avatars/avatar-077.png"),
  "assets/avatars/avatar-078.png": require("@/assets/avatars/avatar-078.png"),
  "assets/avatars/avatar-079.png": require("@/assets/avatars/avatar-079.png"),
  "assets/avatars/avatar-080.png": require("@/assets/avatars/avatar-080.png"),
  "assets/avatars/avatar-081.png": require("@/assets/avatars/avatar-081.png"),
  "assets/avatars/avatar-082.png": require("@/assets/avatars/avatar-082.png"),
  "assets/avatars/avatar-083.png": require("@/assets/avatars/avatar-083.png"),
  "assets/avatars/avatar-084.png": require("@/assets/avatars/avatar-084.png"),
  "assets/avatars/avatar-085.png": require("@/assets/avatars/avatar-085.png"),
  "assets/avatars/avatar-086.png": require("@/assets/avatars/avatar-086.png"),
  "assets/avatars/avatar-087.png": require("@/assets/avatars/avatar-087.png"),
  "assets/avatars/avatar-088.png": require("@/assets/avatars/avatar-088.png"),
  "assets/avatars/avatar-089.png": require("@/assets/avatars/avatar-089.png"),
  "assets/avatars/avatar-090.png": require("@/assets/avatars/avatar-090.png"),
  "assets/avatars/avatar-091.png": require("@/assets/avatars/avatar-091.png"),
  "assets/avatars/avatar-092.png": require("@/assets/avatars/avatar-092.png"),
  "assets/avatars/avatar-093.png": require("@/assets/avatars/avatar-093.png"),
  "assets/avatars/avatar-094.png": require("@/assets/avatars/avatar-094.png"),
  "assets/avatars/avatar-095.png": require("@/assets/avatars/avatar-095.png"),
  "assets/avatars/avatar-096.png": require("@/assets/avatars/avatar-096.png"),
  "assets/avatars/avatar-097.png": require("@/assets/avatars/avatar-097.png"),
  "assets/avatars/avatar-098.png": require("@/assets/avatars/avatar-098.png"),
  "assets/avatars/avatar-099.png": require("@/assets/avatars/avatar-099.png"),
  "assets/avatars/avatar-100.png": require("@/assets/avatars/avatar-100.png"),
};

type EmployeeAvatarProps = {
  name: string;
  profileImage?: string | null;
  size?: number;
};

export function EmployeeAvatar({
  name,
  profileImage,
  size = 60,
}: EmployeeAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [profileImage]);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const source = profileImage
    ? profileImage.startsWith("http")
      ? { uri: profileImage }
      : AVATAR_ASSETS[profileImage]
    : undefined;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      {source && !imageFailed ? (
        <Image
          source={source}
          resizeMode="cover"
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
          onError={() => setImageFailed(true)}
          accessibilityLabel={`${name} profile image`}
        />
      ) : (
        <Text style={styles.initials}>{initials || "EVA"}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#E4F3E9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initials: {
    fontSize: 20,
    color: "#176B45",
    fontWeight: "800",
  },
});
