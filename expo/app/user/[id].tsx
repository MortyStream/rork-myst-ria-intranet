import React from 'react';
import {StyleSheet,View,Text,ScrollView,TouchableOpacity,Linking,Platform,Alert} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, Mail, Edit, Crown, Star, Users } from 'lucide-react-native';
import { useUsersStore } from '@/store/users-store';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';
import { Header } from '@/components/Header';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { AppLayout } from '@/components/AppLayout';

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { getUserById } = useUsersStore();
  const { user: currentUser } = useAuthStore();
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  
  const user = getUserById(id as string);
  
  if (!user) {
    return(
      <AppLayout hideMenuButton={true}>
        <SafeAreaView style={[styles.container,{backgroundColor:theme.background}]} edges={['top']}>
          <Header title="Profil" showBackButton={true} onBackPress={()=>router.back()}/>
          <View style={styles.notFoundContainer}>
            <Text style={[styles.notFoundText,{color:theme.text}]}>Utilisateur non trouvé</Text>
          </View>
        </SafeAreaView>
      </AppLayout>
    );
  }
  
  const handlePhonePress = async () => {
    if (!user.phone) return;
    if (Platform.OS === 'android') {
      Alert.alert(
        'Contact',
        'Que souhaitez-vous faire ?',
        [
          {text:'Appeler',onPress:()=>Linking.openURL(`tel:${user.phone}`)},
          {text:'WhatsApp',onPress:()=>Linking.openURL(`https://wa.me/${user.phone!.replace(/[^0-9]/g,'')}`)},
          {text:'Annuler',style:'cancel'}
        ]
      );
    } else {
      Linking.openURL(`tel:${user.phone}`);
    }
  };
  
  const handleEmailPress = () => {
    if (!user.email) return;
    Linking.openURL(`mailto:${user.email}`);
  };
  
  const handleEditProfile = () => {
    router.push({pathname:'/admin/user-form',params:{id:user.id}});
  };
  
  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'responsable_pole': return 'Responsable de pôle';
      case 'responsable_secteur': return 'Responsable de secteur';
      case 'membre': return 'Membre';
      default: return "Membre de l'association";
    }
  };

  const getAssociationRoleLabel = (associationRole?: string): string => {
    switch (associationRole) {
      case 'president': return 'Président';
      case 'vice_president': return 'Vice-Président(e)';
      case 'tresorier': return 'Trésorier';
      case 'secretaire': return 'Secrétaire';
      case 'comite': return 'Comité';
      case 'membre': return 'Membre';
      case 'sympathisant': return 'Sympathisant';
      default: return '';
    }
  };
  
  const getRoleBadgeVariant = (role: string): 'primary'|'secondary'|'info'|'success'|'warning' => {
    switch (role) {
      case 'admin': return 'primary';
      case 'responsable_pole': return 'secondary';
      case 'responsable_secteur': return 'info';
      default: return 'info';
    }
  };
  
  const getSectorRoleIcon = (isResponsible: boolean, roleId?: string): React.ReactNode => {
    if (isResponsible) {
      return <Crown size={20} color={theme.primary} style={styles.sectorIcon}/>;
    } else if (roleId === 'support') {
      return <Star size={20} color={theme.secondary} style={styles.sectorIcon}/>;
    } else {
      return <Users size={20} color={theme.text} style={styles.sectorIcon}/>;
    }
  };
  
  const getSectorRoleLabel = (isResponsible: boolean, roleId?: string): string => {
    if (isResponsible) return "Responsable";
    if (roleId === 'support') return "Membre support";
    return "Membre";
  };
  
  const canEditProfile = () => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'responsable_pole') return true;
    if (currentUser.id === user.supabaseUserId) return true;
    if (user.editable) return true;
    return false;
  };

  const assocLabel = getAssociationRoleLabel(user.associationRole);
  
  return(
    <AppLayout hideMenuButton={true}>
      <SafeAreaView style={[styles.container,{backgroundColor:theme.background}]} edges={['top']}>
        <Header
          title="Profil"
          showBackButton={true}
          onBackPress={()=>router.back()}
          rightComponent={
            canEditProfile() ?(
              <TouchableOpacity onPress={handleEditProfile} style={styles.editButton}>
                <Edit size={20} color={theme.primary}/>
              </TouchableOpacity>
            ):null
          }
        />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.profileHeader}>
            <Avatar
              source={user.avatarUrl?{uri:user.avatarUrl}:undefined}
              name={`${user.firstName} ${user.lastName}`}
              size={120}
            />
            <Text style={[styles.userName,{color:theme.text}]}>
              {user.firstName} {user.lastName}
            </Text>
            <Badge
              label={getRoleLabel(user.role)}
              variant={getRoleBadgeVariant(user.role)}
              size="medium"
              style={styles.roleBadge}
            />
            {assocLabel ? (
              <Badge
                label={assocLabel}
                variant="success"
                size="small"
                style={styles.editableBadge}
              />
            ) : null}
          </View>
          <Card style={styles.contactCard}>
            <Text style={[styles.sectionTitle,{color:theme.text}]}>Contact</Text>
            {user.phone ?(
              <TouchableOpacity style={styles.contactItem} onPress={handlePhonePress}>
                <Phone size={20} color={theme.primary} style={styles.contactIcon}/>
                <Text style={[styles.contactText,{color:theme.text}]}>{user.phone}</Text>
              </TouchableOpacity>
            ) : null}
            {user.email ?(
              <TouchableOpacity style={styles.contactItem} onPress={handleEmailPress}>
                <Mail size={20} color={theme.primary} style={styles.contactIcon}/>
                <Text style={[styles.contactText,{color:theme.text}]}>{user.email}</Text>
              </TouchableOpacity>
            ) : null}
          </Card>
          {user.sectors && user.sectors.length > 0 ?(
            <Card style={styles.sectorsCard}>
              <Text style={[styles.sectionTitle,{color:theme.text}]}>Secteurs</Text>
              {user.sectors.map((sector,index)=>{
                const icon = getSectorRoleIcon(sector.isResponsible,sector.roleId);
                const roleLabel = getSectorRoleLabel(sector.isResponsible,sector.roleId);
                return(
                  <View key={`sector-${index}`} style={styles.sectorItem}>
                    {icon}
                    <View style={styles.sectorTextContainer}>
                      <Text style={[styles.sectorRoleText,{color:theme.text}]}>{roleLabel}</Text>
                      <Text style={[styles.sectorNameText,{color:theme.text}]}>{sector.name}</Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          ) : null}
          {user.bio ?(
            <Card style={styles.bioCard}>
              <Text style={[styles.sectionTitle,{color:theme.text}]}>Biographie</Text>
              <Text style={[styles.bioText,{color:theme.text}]}>{user.bio}</Text>
            </Card>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container:{flex:1},
  scrollView:{flex:1},
  scrollContent:{padding:20,paddingBottom:40},
  notFoundContainer:{flex:1,justifyContent:'center',alignItems:'center'},
  notFoundText:{fontSize:18,fontWeight:'500'},
  profileHeader:{alignItems:'center',marginBottom:24},
  userName:{fontSize:24,fontWeight:'bold',marginTop:16,marginBottom:8,textAlign:'center'},
  roleBadge:{marginBottom:8},
  editableBadge:{marginBottom:8},
  nonEditableBadge:{marginBottom:8},
  contactCard:{marginBottom:16},
  sectorsCard:{marginBottom:16},
  bioCard:{marginBottom:16},
  sectionTitle:{fontSize:18,fontWeight:'600',marginBottom:16},
  contactItem:{flexDirection:'row',alignItems:'center',marginBottom:12},
  contactIcon:{marginRight:12},
  contactText:{fontSize:16},
  sectorItem:{flexDirection:'row',alignItems:'flex-start',marginBottom:16},
  sectorIcon:{marginRight:12,marginTop:2},
  sectorTextContainer:{flex:1},
  sectorRoleText:{fontSize:16,fontWeight:'600',marginBottom:2},
  sectorNameText:{fontSize:14},
  bioText:{fontSize:16,lineHeight:24},
  editButton:{padding:8}
});
